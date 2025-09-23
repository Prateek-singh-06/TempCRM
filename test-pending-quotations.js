// Test script to verify pending quotations functionality
const fs = require('fs');
const path = require('path');

console.log('Testing Pending Quotations Setup...\n');

// Check if uploads directories exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
const quotationsDir = path.join(uploadsDir, 'quotations');
const documentsDir = path.join(uploadsDir, 'documents');

console.log('1. Checking upload directories:');
console.log('   - Uploads directory:', fs.existsSync(uploadsDir) ? '✅ EXISTS' : '❌ MISSING');
console.log('   - Quotations directory:', fs.existsSync(quotationsDir) ? '✅ EXISTS' : '❌ MISSING');
console.log('   - Documents directory:', fs.existsSync(documentsDir) ? '✅ EXISTS' : '❌ MISSING');

// Check if pending quotations page exists
const pendingQuotationsPage = path.join(__dirname, 'src', 'app', '(main)', 'pending-quotations', 'page.tsx');
console.log('\n2. Checking pending quotations page:');
console.log('   - Page file:', fs.existsSync(pendingQuotationsPage) ? '✅ EXISTS' : '❌ MISSING');

// Check if stage API exists
const stageApi = path.join(__dirname, 'src', 'app', 'api', 'pending-quotations', '[id]', 'stage', 'route.ts');
console.log('\n3. Checking stage API:');
console.log('   - Stage API file:', fs.existsSync(stageApi) ? '✅ EXISTS' : '❌ MISSING');

// Check if upload API handles documents
const uploadApi = path.join(__dirname, 'src', 'app', 'api', 'upload', 'route.ts');
console.log('\n4. Checking upload API:');
if (fs.existsSync(uploadApi)) {
  const uploadContent = fs.readFileSync(uploadApi, 'utf8');
  const hasDocumentSupport = uploadContent.includes('multipart/form-data');
  const hasQuotationFolder = uploadContent.includes('quotations');
  console.log('   - Upload API file: ✅ EXISTS');
  console.log('   - Document upload support:', hasDocumentSupport ? '✅ SUPPORTED' : '❌ NOT SUPPORTED');
  console.log('   - Quotation folder handling:', hasQuotationFolder ? '✅ HANDLED' : '❌ NOT HANDLED');
} else {
  console.log('   - Upload API file: ❌ MISSING');
}

console.log('\n5. Summary:');
const allChecks = [
  fs.existsSync(uploadsDir),
  fs.existsSync(quotationsDir),
  fs.existsSync(documentsDir),
  fs.existsSync(pendingQuotationsPage),
  fs.existsSync(stageApi),
  fs.existsSync(uploadApi)
];

const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;

console.log(`   - Passed checks: ${passedChecks}/${totalChecks}`);

if (passedChecks === totalChecks) {
  console.log('\n🎉 All basic setup checks passed! The pending quotations system should be working.');
} else {
  console.log('\n⚠️  Some checks failed. Please review the setup.');
}

console.log('\nNext steps:');
console.log('1. Start the development server: npm run dev');
console.log('2. Navigate to /pending-quotations');
console.log('3. Try creating a proposal from the opportunities page');
console.log('4. Verify that opportunities get frozen and quotations appear in the pending list');
console.log('5. Test file upload and stage changes');
