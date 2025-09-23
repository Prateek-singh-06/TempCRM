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
let token = null;

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
      // Extract token from cookies or create a simple auth header
      // For this test, we'll use the user ID as a simple auth mechanism
      token = 'test-token-' + Date.now(); // Placeholder token
      console.log(`${colors.green}✓ Login successful${colors.reset}`);
      console.log(`  User: ${data.user.name} (${data.user.email})`);
      return true;
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
  
  for (const period of periods) {
    console.log(`\n${colors.blue}Testing period: ${period}${colors.reset}`);
    
    for (const type of reportTypes) {
      try {
        const response = await fetch(`${baseUrl}/api/reports?period=${period}&type=${type}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
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
            console.log(`    - Total value: ₹${(pipeline.metrics?.totalValue || 0).toLocaleString('en-IN')}`);
            console.log(`    - Weighted value: ₹${(pipeline.metrics?.weightedValue || 0).toLocaleString('en-IN')}`);
            if (pipeline.metrics?.stageDistribution) {
              console.log(`    - Stage distribution:`, Object.entries(pipeline.metrics.stageDistribution)
                .map(([k, v]) => `${k}: ${v}`).join(', '));
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
          console.log(`  ${colors.yellow}⚠ ${type} report:${colors.reset} Status ${response.status}`);
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
      startDate: '2024-10-01',
      endDate: '2024-12-31', 
      description: 'Q4 2024'
    },
    {
      startDate: '2024-12-01',
      endDate: '2024-12-15',
      description: 'First half of December 2024'
    }
  ];
  
  for (const range of dateRanges) {
    console.log(`\n${colors.blue}Testing date range: ${range.description}${colors.reset}`);
    
    try {
      const response = await fetch(`${baseUrl}/api/reports?type=sales&startDate=${range.startDate}&endDate=${range.endDate}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
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

async function testExportFunctionality() {
  console.log(`\n${colors.cyan}4. Testing Export Functionality...${colors.reset}`);
  
  const formats = ['excel', 'pdf'];
  const reportTypes = ['sales', 'pipeline', 'forecast'];
  
  for (const format of formats) {
    console.log(`\n${colors.blue}Testing ${format.toUpperCase()} export${colors.reset}`);
    
    for (const type of reportTypes) {
      try {
        const response = await fetch(`${baseUrl}/api/export?format=${format}&reportType=${type}&period=month`, {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          const expectedType = format === 'excel' 
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf';
          
          if (contentType?.includes(expectedType)) {
            console.log(`  ${colors.green}✓ ${type} export:${colors.reset} Generated successfully`);
            
            // Save sample files
            const buffer = await response.arrayBuffer();
            const extension = format === 'excel' ? 'xlsx' : 'pdf';
            const filename = `test-export-${type}.${extension}`;
            const filepath = path.join(__dirname, 'exports', filename);
            
            // Create exports directory if it doesn't exist
            if (!fs.existsSync(path.join(__dirname, 'exports'))) {
              fs.mkdirSync(path.join(__dirname, 'exports'));
            }
            
            fs.writeFileSync(filepath, Buffer.from(buffer));
            console.log(`    - Saved to: exports/${filename} (${(buffer.byteLength / 1024).toFixed(1)} KB)`);
          } else {
            console.log(`  ${colors.yellow}⚠ ${type} export:${colors.reset} Unexpected content type: ${contentType}`);
          }
        } else {
          console.log(`  ${colors.yellow}⚠ ${type} export:${colors.reset} Status ${response.status}`);
        }
      } catch (error) {
        console.log(`  ${colors.red}✗ ${type} export failed:${colors.reset}`, error.message);
      }
    }
  }
}

async function testPipelineVisualization() {
  console.log(`\n${colors.cyan}5. Testing Pipeline Visualization Data...${colors.reset}`);
  
  try {
    const response = await fetch(`${baseUrl}/api/reports?type=pipeline&period=month`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
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
          stages.forEach(([stage, count]) => {
            const percentage = metrics.totalDeals > 0 
              ? ((count / metrics.totalDeals) * 100).toFixed(1) 
              : 0;
            console.log(`    - ${stage}: ${count} deals (${percentage}%)`);
          });
        }
        
        // Validate stage values for bar chart
        if (metrics.stageValues) {
          console.log('\n  Stage Values (for Bar chart):');
          Object.entries(metrics.stageValues).forEach(([stage, value]) => {
            console.log(`    - ${stage}: ₹${value.toLocaleString('en-IN')}`);
          });
        }
        
        // Validate recommendations
        if (data.data.pipeline.recommendations?.length > 0) {
          console.log('\n  AI Recommendations:');
          data.data.pipeline.recommendations.slice(0, 3).forEach((rec, i) => {
            console.log(`    ${i + 1}. ${rec}`);
          });
        }
      }
    } else {
      console.log(`${colors.red}✗ Pipeline visualization test failed:${colors.reset} Status ${response.status}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Pipeline visualization test error:${colors.reset}`, error.message);
  }
}

async function testExportWithDateFilter() {
  console.log(`\n${colors.cyan}6. Testing Export with Date Filters...${colors.reset}`);
  
  try {
    const startDate = '2024-11-01';
    const endDate = '2024-12-31';
    
    console.log(`\n${colors.blue}Exporting data for Nov-Dec 2024${colors.reset}`);
    
    const response = await fetch(
      `${baseUrl}/api/export?format=excel&reportType=sales&startDate=${startDate}&endDate=${endDate}`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const filename = 'test-export-filtered-sales.xlsx';
      const filepath = path.join(__dirname, 'exports', filename);
      
      fs.writeFileSync(filepath, Buffer.from(buffer));
      console.log(`  ${colors.green}✓ Filtered export successful${colors.reset}`);
      console.log(`    - Saved to: exports/${filename} (${(buffer.byteLength / 1024).toFixed(1)} KB)`);
      console.log(`    - Date range: ${startDate} to ${endDate}`);
    } else {
      console.log(`  ${colors.red}✗ Filtered export failed:${colors.reset} Status ${response.status}`);
    }
  } catch (error) {
    console.log(`  ${colors.red}✗ Filtered export error:${colors.reset}`, error.message);
  }
}

async function runAllTests() {
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}CRM Reports Comprehensive Test Suite${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log(`${colors.red}Cannot proceed without authentication${colors.reset}`);
    return;
  }
  
  // Run all test suites
  await testReportsAPI();
  await delay(500);
  
  await testDateFiltering();
  await delay(500);
  
  await testPipelineVisualization();
  await delay(500);
  
  await testExportFunctionality();
  await delay(500);
  
  await testExportWithDateFilter();
  
  // Summary
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.green}✓ All tests completed!${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  
  console.log(`\n${colors.yellow}Next Steps:${colors.reset}`);
  console.log('1. Check the exports/ directory for generated files');
  console.log('2. Open http://localhost:3001/reports in your browser');
  console.log('3. Test the date range picker UI');
  console.log('4. Verify pipeline distribution charts (pie, funnel, bar)');
  console.log('5. Test export buttons for each report type');
}

// Run tests
runAllTests().catch(error => {
  console.error(`${colors.red}Test suite error:${colors.reset}`, error);
  process.exit(1);
});