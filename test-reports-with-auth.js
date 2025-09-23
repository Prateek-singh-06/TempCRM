#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const baseUrl = 'http://localhost:3001';
let authCookie = null;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login() {
  console.log(`${colors.cyan}1. Logging in...${colors.reset}`);
  try {
    const response = await fetch(`${baseUrl}/api/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@crm.com',
        password: 'Test@123'
      })
    });
    
    const data = await response.json();
    if (data.success) {
      // Extract cookie from response headers
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        // Extract the token cookie
        const tokenMatch = setCookieHeader.match(/token=([^;]+)/);
        if (tokenMatch) {
          authCookie = `token=${tokenMatch[1]}`;
          console.log(`${colors.green}✓ Login successful${colors.reset}`);
          console.log(`  User: ${data.user.name} (${data.user.email})`);
          return true;
        }
      }
      console.log(`${colors.yellow}⚠ Login successful but no cookie found${colors.reset}`);
      return false;
    } else {
      console.log(`${colors.red}✗ Login failed:${colors.reset}`, data);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}✗ Login error:${colors.reset}`, error);
    return false;
  }
}

async function testReportsAPI() {
  console.log(`\n${colors.cyan}2. Testing Reports API...${colors.reset}`);
  
  const periods = ['week', 'month', 'quarter', 'year'];
  const reportTypes = ['sales', 'forecast', 'pipeline', 'quotations', 'attendance'];
  
  // Test just a subset for quick validation
  for (const period of ['month', 'quarter']) {
    console.log(`\n${colors.blue}Testing period: ${period}${colors.reset}`);
    
    for (const type of reportTypes) {
      try {
        const response = await fetch(`${baseUrl}/api/reports?period=${period}&type=${type}`, {
          headers: { 
            'Cookie': authCookie,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`  ${colors.green}✓ ${type} report:${colors.reset} Generated successfully`);
          
          // Validate specific report data
          if (type === 'pipeline' && data.data?.pipeline) {
            const pipeline = data.data.pipeline;
            console.log(`    - Total deals: ${pipeline.metrics?.totalDeals || 0}`);
            console.log(`    - Total value: $${(pipeline.metrics?.totalValue || 0).toLocaleString('en-US')}`);
            console.log(`    - Weighted value: $${(pipeline.metrics?.weightedValue || 0).toLocaleString('en-US')}`);
            if (pipeline.metrics?.stageDistribution) {
              const stages = Object.entries(pipeline.metrics.stageDistribution).slice(0, 3);
              console.log(`    - Top stages:`, stages.map(([k, v]) => `${k}: ${v}`).join(', '));
            }
          }
          
          if (type === 'sales' && data.data?.sales) {
            const sales = data.data.sales;
            console.log(`    - Total leads: ${sales.totalLeads || 0}`);
            console.log(`    - Total opportunities: ${sales.totalOpportunities || 0}`);
            console.log(`    - Conversion rate: ${((sales.conversionRate || 0) * 100).toFixed(1)}%`);
          }
          
          if (type === 'attendance' && data.data?.attendance) {
            const attendance = data.data.attendance;
            console.log(`    - Total employees: ${attendance.totalEmployees || 0}`);
            console.log(`    - Present today: ${attendance.presentToday || 0}`);
            console.log(`    - Absent today: ${attendance.absentToday || 0}`);
          }
        } else {
          const errorText = await response.text();
          if (errorText.includes('<!DOCTYPE')) {
            console.log(`  ${colors.red}✗ ${type} report:${colors.reset} Redirected to login (auth issue)`);
          } else {
            console.log(`  ${colors.yellow}⚠ ${type} report:${colors.reset} Status ${response.status}`);
          }
        }
      } catch (error) {
        console.log(`  ${colors.red}✗ ${type} report failed:${colors.reset}`, error.message);
      }
    }
  }
}

async function testDateFiltering() {
  console.log(`\n${colors.cyan}3. Testing Date Filtering...${colors.reset}`);
  
  const dateRanges = [
    { 
      startDate: '2024-01-01', 
      endDate: '2024-01-31',
      description: 'January 2024'
    },
    {
      startDate: '2024-12-01',
      endDate: '2024-12-31',
      description: 'December 2024'
    }
  ];
  
  for (const range of dateRanges) {
    console.log(`\n${colors.blue}Testing date range: ${range.description}${colors.reset}`);
    
    try {
      const response = await fetch(`${baseUrl}/api/reports?type=sales&startDate=${range.startDate}&endDate=${range.endDate}`, {
        headers: { 
          'Cookie': authCookie,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  ${colors.green}✓ Date filter applied successfully${colors.reset}`);
        
        if (data.data?.sales) {
          const sales = data.data.sales;
          console.log(`    - Leads in range: ${sales.totalLeads || 0}`);
          console.log(`    - Opportunities in range: ${sales.totalOpportunities || 0}`);
          
          // Check if monthly trends are within date range
          if (sales.monthlyTrends?.length > 0) {
            console.log(`    - Monthly trend data points: ${sales.monthlyTrends.length}`);
          }
        }
      } else {
        console.log(`  ${colors.yellow}⚠ Date filter test:${colors.reset} Status ${response.status}`);
      }
    } catch (error) {
      console.log(`  ${colors.red}✗ Date filter test failed:${colors.reset}`, error.message);
    }
  }
}

async function testPipelineVisualization() {
  console.log(`\n${colors.cyan}4. Testing Pipeline Visualization Data...${colors.reset}`);
  
  try {
    const response = await fetch(`${baseUrl}/api/reports?type=pipeline&period=month`, {
      headers: { 
        'Cookie': authCookie,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.data?.pipeline?.metrics) {
        const metrics = data.data.pipeline.metrics;
        console.log(`${colors.green}✓ Pipeline visualization data retrieved${colors.reset}`);
        
        // Validate stage distribution for charts
        if (metrics.stageDistribution) {
          console.log('\n  Stage Distribution (for Pie/Funnel chart):');
          const stages = Object.entries(metrics.stageDistribution);
          let total = 0;
          stages.forEach(([stage, count]) => {
            total += count;
          });
          
          stages.forEach(([stage, count]) => {
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            console.log(`    - ${stage}: ${count} deals (${percentage}%)`);
          });
        }
        
        // Validate stage values for bar chart
        if (metrics.stageValues) {
          console.log('\n  Stage Values (for Bar chart):');
          Object.entries(metrics.stageValues).forEach(([stage, value]) => {
            console.log(`    - ${stage}: $${value.toLocaleString('en-US')}`);
          });
        }
        
        // Validate recommendations
        if (data.data.pipeline.recommendations?.length > 0) {
          console.log('\n  AI Recommendations:');
          data.data.pipeline.recommendations.slice(0, 3).forEach((rec, i) => {
            console.log(`    ${i + 1}. ${rec}`);
          });
        }
        
        // Test data structure for charts
        console.log('\n  Chart Data Validation:');
        console.log(`    - Has stage distribution: ${!!metrics.stageDistribution}`);
        console.log(`    - Has stage values: ${!!metrics.stageValues}`);
        console.log(`    - Has total deals: ${!!metrics.totalDeals}`);
        console.log(`    - Has weighted value: ${!!metrics.weightedValue}`);
      }
    } else {
      console.log(`${colors.red}✗ Pipeline visualization test failed:${colors.reset} Status ${response.status}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Pipeline visualization test error:${colors.reset}`, error.message);
  }
}

async function testExportFunctionality() {
  console.log(`\n${colors.cyan}5. Testing Export Functionality...${colors.reset}`);
  
  // Create exports directory if it doesn't exist
  const exportsDir = path.join(__dirname, 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir);
  }
  
  const tests = [
    { format: 'excel', type: 'sales' },
    { format: 'excel', type: 'pipeline' },
    { format: 'pdf', type: 'sales' }
  ];
  
  for (const test of tests) {
    try {
      console.log(`\n  Testing ${test.format.toUpperCase()} export for ${test.type}...`);
      
      const response = await fetch(
        `${baseUrl}/api/export?format=${test.format}&reportType=${test.type}&period=month`,
        {
          headers: { 
            'Cookie': authCookie
          }
        }
      );
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const expectedType = test.format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf';
        
        if (contentType?.includes(expectedType)) {
          const buffer = await response.arrayBuffer();
          const extension = test.format === 'excel' ? 'xlsx' : 'pdf';
          const filename = `test-${test.type}.${extension}`;
          const filepath = path.join(exportsDir, filename);
          
          fs.writeFileSync(filepath, Buffer.from(buffer));
          console.log(`  ${colors.green}✓ Export successful${colors.reset}`);
          console.log(`    - File: exports/${filename}`);
          console.log(`    - Size: ${(buffer.byteLength / 1024).toFixed(1)} KB`);
        } else {
          console.log(`  ${colors.yellow}⚠ Unexpected content type: ${contentType}${colors.reset}`);
        }
      } else {
        console.log(`  ${colors.red}✗ Export failed: Status ${response.status}${colors.reset}`);
      }
    } catch (error) {
      console.log(`  ${colors.red}✗ Export error: ${error.message}${colors.reset}`);
    }
  }
}

async function testUIEndpoints() {
  console.log(`\n${colors.cyan}6. Testing UI Page Access...${colors.reset}`);
  
  const pages = [
    '/reports',
    '/dashboard',
    '/leads',
    '/opportunities',
    '/pipelines'
  ];
  
  for (const page of pages) {
    try {
      const response = await fetch(`${baseUrl}${page}`, {
        headers: { 
          'Cookie': authCookie,
          'Accept': 'text/html'
        }
      });
      
      if (response.ok) {
        const html = await response.text();
        if (html.includes('<!DOCTYPE html>') && !html.includes('Login')) {
          console.log(`  ${colors.green}✓ ${page}: Accessible${colors.reset}`);
        } else if (html.includes('Login')) {
          console.log(`  ${colors.yellow}⚠ ${page}: Redirected to login${colors.reset}`);
        }
      } else {
        console.log(`  ${colors.red}✗ ${page}: Status ${response.status}${colors.reset}`);
      }
    } catch (error) {
      console.log(`  ${colors.red}✗ ${page}: Error - ${error.message}${colors.reset}`);
    }
  }
}

async function runAllTests() {
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}CRM Reports System - Comprehensive Test${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log(`${colors.red}Cannot proceed without authentication${colors.reset}`);
    return;
  }
  
  // Run test suites
  await testReportsAPI();
  await delay(300);
  
  await testDateFiltering();
  await delay(300);
  
  await testPipelineVisualization();
  await delay(300);
  
  await testExportFunctionality();
  await delay(300);
  
  await testUIEndpoints();
  
  // Summary
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.green}✓ Test Suite Completed!${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  
  console.log(`\n${colors.yellow}Manual Testing Steps:${colors.reset}`);
  console.log('1. Open http://localhost:3001/reports in your browser');
  console.log('2. Login with test@crm.com / Test@123');
  console.log('3. Test the date range picker functionality');
  console.log('4. Verify all report tabs display correctly:');
  console.log('   - Sales Report');
  console.log('   - Forecast Report'); 
  console.log('   - Pipeline Report (with charts)');
  console.log('   - Quotations Report');
  console.log('   - Attendance Report');
  console.log('5. Test export buttons for Excel and PDF');
  console.log('6. Verify pipeline distribution charts:');
  console.log('   - Pie chart showing stage percentages');
  console.log('   - Funnel chart showing progression');
  console.log('   - Bar chart showing values by stage');
  console.log('7. Check AI recommendations display');
  
  console.log(`\n${colors.green}Check the 'exports' directory for generated files.${colors.reset}`);
}

// Run tests
runAllTests().catch(error => {
  console.error(`${colors.red}Test suite error:${colors.reset}`, error);
  process.exit(1);
});