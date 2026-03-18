#!/usr/bin/env node

/**
 * Luna HRM Cleanup Script
 *
 * Xóa toàn bộ test data, giữ lại tài khoản admin duy nhất
 *
 * Usage:
 *   node scripts/cleanup-test-data.js
 *
 * Environment:
 *   SUPABASE_URL=https://btwwqeemwedtbnskjcem.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://btwwqeemwedtbnskjcem.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_UUID = '10000000-0000-0000-0000-000000000001';
const ADMIN_EMAIL = 'cuongpham.work@gmail.com';
const BRANCH_TANMAI = '00000000-0000-0000-0000-000000000001';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function cleanup() {
  console.log('🔴 Luna HRM Cleanup Test Data');
  console.log('===============================\n');

  if (!SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in environment');
    console.error('   Export it first: export SUPABASE_SERVICE_ROLE_KEY=<key>');
    process.exit(1);
  }

  // Confirm
  console.log('⚠️  This will DELETE:');
  console.log('   - All employees except admin');
  console.log('   - All class schedules');
  console.log('   - All attendance records');
  console.log('   - All payroll entries');
  console.log('   - All KPI evaluations');
  console.log('   - All weekly notes');
  console.log('   - All branches except CS Tân Mai\n');
  console.log('✅ This will KEEP:');
  console.log(`   - Admin employee (UUID: ${ADMIN_UUID})`);
  console.log(`   - Updated email: ${ADMIN_EMAIL}`);
  console.log(`   - CS Tân Mai branch (UUID: ${BRANCH_TANMAI})\n`);

  const confirm = await question('Type "DELETE" to confirm: ');

  if (confirm !== 'DELETE') {
    console.log('\n❌ Cleanup cancelled.');
    process.exit(0);
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    console.log('\n📝 Starting cleanup...\n');

    // Step 1: Delete transactional data (in correct order)
    console.log('Step 1/9: Deleting audit logs...');
    await supabase.from('audit_logs').delete().neq('id', 'NULL');

    console.log('Step 2/9: Deleting evaluation scores...');
    await supabase.from('evaluation_scores').delete().neq('id', 'NULL');

    console.log('Step 3/9: Deleting employee evaluations...');
    await supabase.from('employee_evaluations').delete().neq('id', 'NULL');

    console.log('Step 4/9: Deleting evaluation criteria & templates...');
    await supabase.from('evaluation_criteria').delete().neq('id', 'NULL');
    await supabase.from('evaluation_templates').delete().neq('id', 'NULL');
    await supabase.from('evaluation_periods').delete().neq('id', 'NULL');

    console.log('Step 5/9: Deleting KPI evaluations...');
    await supabase.from('kpi_evaluations').delete().neq('id', 'NULL');

    console.log('Step 6/9: Deleting payslips & payroll periods...');
    await supabase.from('payslips').delete().neq('id', 'NULL');
    await supabase.from('payroll_periods').delete().neq('id', 'NULL');

    console.log('Step 7/9: Deleting employee weekly notes...');
    await supabase.from('employee_weekly_notes').delete().neq('id', 'NULL');

    console.log('Step 8/9: Deleting attendance records...');
    await supabase.from('attendance').delete().neq('id', 'NULL');
    await supabase.from('office_attendance').delete().neq('id', 'NULL');
    await supabase.from('attendance_locks').delete().neq('id', 'NULL');

    console.log('Step 9/9: Deleting salary components & notes...');
    await supabase.from('salary_components').delete().neq('id', 'NULL');
    await supabase.from('employee_notes').delete().neq('id', 'NULL');

    console.log('Step 10/9: Deleting class schedules...');
    await supabase.from('class_schedules').delete().neq('id', 'NULL');

    console.log('Step 11/9: Deleting non-admin employees...');
    await supabase
      .from('employees')
      .delete()
      .neq('id', ADMIN_UUID);

    console.log('Step 12/9: Deleting non-TanMai branches...');
    await supabase
      .from('branches')
      .delete()
      .neq('id', BRANCH_TANMAI);

    // Step 2: Update admin employee email
    console.log('Step 13/8: Updating admin email...');
    const { error: updateError } = await supabase
      .from('employees')
      .update({ email: ADMIN_EMAIL })
      .eq('id', ADMIN_UUID);

    if (updateError) throw updateError;

    // Step 3: Verify
    console.log('\n📊 Verifying cleanup...\n');

    const { count: empCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ Employees: ${empCount} (expected: 1)`);

    const { count: branchCount } = await supabase
      .from('branches')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ Branches: ${branchCount} (expected: 1)`);

    const { count: classCount } = await supabase
      .from('class_schedules')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ Classes: ${classCount} (expected: 0)`);

    const { count: attendanceCount } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ Attendance: ${attendanceCount} (expected: 0)`);

    const { count: payslipCount } = await supabase
      .from('payslips')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ Payslips: ${payslipCount} (expected: 0)`);

    const { count: payrollPeriodCount } = await supabase
      .from('payroll_periods')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ Payroll Periods: ${payrollPeriodCount} (expected: 0)`);

    // Fetch admin employee
    const { data: admin } = await supabase
      .from('employees')
      .select('id, full_name, email, role')
      .eq('id', ADMIN_UUID)
      .single();

    if (!admin) {
      throw new Error('❌ Admin employee not found!');
    }

    console.log(`\n✅ Admin employee:\n   ID: ${admin.id}\n   Name: ${admin.full_name}\n   Email: ${admin.email}\n   Role: ${admin.role}`);

    console.log('\n✨ ✨ ✨ Cleanup completed successfully! ✨ ✨ ✨\n');

    // Next: auth user setup
    console.log('⚠️  Next steps:');
    console.log(`   1. Create Supabase auth user with email: ${ADMIN_EMAIL}`);
    console.log('   2. Set app_metadata: { "role": "admin", "branch_id": "' + BRANCH_TANMAI + '" }');
    console.log('   3. If auth UUID differs from ' + ADMIN_UUID + ', update employees.id');
    console.log('\n📖 See CLEANUP-GUIDE.md for detailed instructions.\n');

  } catch (err) {
    console.error('\n❌ Cleanup failed:', err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

cleanup();
