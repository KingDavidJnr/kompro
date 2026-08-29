/**
 * Database seed script for Kompro.
 *
 * Idempotently creates the core permission set, the default roles
 * (admin, auditor, member), the single organization row, and an optional
 * bootstrap admin user from environment variables. Run with `npm run seed`.
 */

const bcrypt = require('bcrypt');
const prisma = require('../src/lib/prisma');
const config = require('../src/config');

// Canonical permission list. Add new permissions here as features grow.
const PERMISSIONS = [
  { name: 'org:read', description: 'View organization settings' },
  { name: 'org:update', description: 'Update organization settings' },
  { name: 'users:read', description: 'List and view users' },
  { name: 'users:create', description: 'Create users' },
  { name: 'users:update', description: 'Update users' },
  { name: 'users:delete', description: 'Delete users' },
  { name: 'roles:read', description: 'View roles and permissions' },
  { name: 'roles:create', description: 'Create roles' },
  { name: 'roles:update', description: 'Update roles' },
  { name: 'roles:delete', description: 'Delete roles' },
  { name: 'audit:read', description: 'View audit log' },
  { name: 'controls:read', description: 'View controls' },
  { name: 'controls:create', description: 'Create controls' },
  { name: 'controls:update', description: 'Update controls' },
  { name: 'controls:delete', description: 'Delete controls' },
  { name: 'policies:read', description: 'View policies' },
  { name: 'policies:create', description: 'Create policies' },
  { name: 'policies:update', description: 'Update policies' },
  { name: 'policies:delete', description: 'Delete policies' },
  { name: 'evidence:read', description: 'View evidence' },
  { name: 'evidence:create', description: 'Create evidence' },
  { name: 'evidence:update', description: 'Update evidence' },
  { name: 'evidence:delete', description: 'Delete evidence' },
  { name: 'assessments:read', description: 'View assessments' },
  { name: 'assessments:create', description: 'Create assessments' },
  { name: 'assessments:update', description: 'Update assessments' },
  { name: 'assessments:delete', description: 'Delete assessments' },
  { name: 'frameworks:read', description: 'View frameworks, requirements and mappings' },
  { name: 'frameworks:create', description: 'Create frameworks and requirements' },
  { name: 'frameworks:update', description: 'Update frameworks, requirements and mappings' },
  { name: 'frameworks:delete', description: 'Delete frameworks and requirements' },
  { name: 'audit:purge', description: 'Purge audit log entries' },
];

// Default roles and the permissions each one grants.
const ROLES = [
  { name: 'admin', description: 'Full access', permissions: PERMISSIONS.map((p) => p.name) },
  {
    name: 'auditor',
    description: 'Read-only compliance and audit access',
    permissions: ['org:read', 'users:read', 'roles:read', 'audit:read', 'controls:read', 'policies:read', 'evidence:read', 'assessments:read', 'frameworks:read'],
  },
  { name: 'member', description: 'Basic member access', permissions: ['org:read'] },
];

// Seeded compliance frameworks. Each ships with its current, authoritative
// requirement catalog (ISO/IEC 27001:2022 Annex A, AICPA 2017 TSC, GDPR core
// articles) so readiness is measurable on day one. Mappings to an
// organization's own controls are still added via the API.
const FRAMEWORKS = [
  { name: 'ISO 27001', description: 'Information security management system standard' },
  { name: 'SOC 2', description: 'Service organization control trust principles' },
  { name: 'GDPR', description: 'General Data Protection Regulation' },
];

const FRAMEWORK_DESCRIPTIONS = Object.fromEntries(
  FRAMEWORKS.map((framework) => [framework.name, framework.description])
);

// ISO/IEC 27001:2022 Annex A - 93 controls across four themes.
const ISO_27001_REQUIREMENTS = [
  { code: 'A.5.1', title: 'Policies for information security', description: 'Organizational controls' },
  { code: 'A.5.2', title: 'Information security roles and responsibilities', description: 'Organizational controls' },
  { code: 'A.5.3', title: 'Segregation of duties', description: 'Organizational controls' },
  { code: 'A.5.4', title: 'Management responsibilities', description: 'Organizational controls' },
  { code: 'A.5.5', title: 'Contact with authorities', description: 'Organizational controls' },
  { code: 'A.5.6', title: 'Contact with special interest groups', description: 'Organizational controls' },
  { code: 'A.5.7', title: 'Threat intelligence', description: 'Organizational controls' },
  { code: 'A.5.8', title: 'Information security in project management', description: 'Organizational controls' },
  { code: 'A.5.9', title: 'Inventory of information and other associated assets', description: 'Organizational controls' },
  { code: 'A.5.10', title: 'Acceptable use of information and other associated assets', description: 'Organizational controls' },
  { code: 'A.5.11', title: 'Return of assets', description: 'Organizational controls' },
  { code: 'A.5.12', title: 'Classification of information', description: 'Organizational controls' },
  { code: 'A.5.13', title: 'Labelling of information', description: 'Organizational controls' },
  { code: 'A.5.14', title: 'Information transfer', description: 'Organizational controls' },
  { code: 'A.5.15', title: 'Access control', description: 'Organizational controls' },
  { code: 'A.5.16', title: 'Identity management', description: 'Organizational controls' },
  { code: 'A.5.17', title: 'Authentication information', description: 'Organizational controls' },
  { code: 'A.5.18', title: 'Access rights', description: 'Organizational controls' },
  { code: 'A.5.19', title: 'Information security in supplier relationships', description: 'Organizational controls' },
  { code: 'A.5.20', title: 'Addressing information security within supplier agreements', description: 'Organizational controls' },
  { code: 'A.5.21', title: 'Managing information security in the ICT supply chain', description: 'Organizational controls' },
  { code: 'A.5.22', title: 'Monitoring, review and change management of supplier services', description: 'Organizational controls' },
  { code: 'A.5.23', title: 'Information security for use of cloud services', description: 'Organizational controls' },
  { code: 'A.5.24', title: 'Information security incident management planning and preparation', description: 'Organizational controls' },
  { code: 'A.5.25', title: 'Assessment and decision on information security events', description: 'Organizational controls' },
  { code: 'A.5.26', title: 'Response to information security incidents', description: 'Organizational controls' },
  { code: 'A.5.27', title: 'Learning from information security incidents', description: 'Organizational controls' },
  { code: 'A.5.28', title: 'Collection of evidence', description: 'Organizational controls' },
  { code: 'A.5.29', title: 'Information security during disruption', description: 'Organizational controls' },
  { code: 'A.5.30', title: 'ICT readiness for business continuity', description: 'Organizational controls' },
  { code: 'A.5.31', title: 'Legal, statutory, regulatory and contractual requirements', description: 'Organizational controls' },
  { code: 'A.5.32', title: 'Intellectual property rights', description: 'Organizational controls' },
  { code: 'A.5.33', title: 'Protection of records', description: 'Organizational controls' },
  { code: 'A.5.34', title: 'Privacy and protection of PII', description: 'Organizational controls' },
  { code: 'A.5.35', title: 'Independent review of information security', description: 'Organizational controls' },
  { code: 'A.5.36', title: 'Compliance with policies, rules and standards for information security', description: 'Organizational controls' },
  { code: 'A.5.37', title: 'Documented operating procedures', description: 'Organizational controls' },
  { code: 'A.6.1', title: 'Screening', description: 'People controls' },
  { code: 'A.6.2', title: 'Terms and conditions of employment', description: 'People controls' },
  { code: 'A.6.3', title: 'Information security awareness, education and training', description: 'People controls' },
  { code: 'A.6.4', title: 'Disciplinary process', description: 'People controls' },
  { code: 'A.6.5', title: 'Responsibilities after termination or change of employment', description: 'People controls' },
  { code: 'A.6.6', title: 'Confidentiality or non-disclosure agreements', description: 'People controls' },
  { code: 'A.6.7', title: 'Remote working', description: 'People controls' },
  { code: 'A.6.8', title: 'Information security event reporting', description: 'People controls' },
  { code: 'A.7.1', title: 'Physical security perimeters', description: 'Physical controls' },
  { code: 'A.7.2', title: 'Physical entry', description: 'Physical controls' },
  { code: 'A.7.3', title: 'Securing offices, rooms and facilities', description: 'Physical controls' },
  { code: 'A.7.4', title: 'Physical security monitoring', description: 'Physical controls' },
  { code: 'A.7.5', title: 'Protecting against physical and environmental threats', description: 'Physical controls' },
  { code: 'A.7.6', title: 'Working in secure areas', description: 'Physical controls' },
  { code: 'A.7.7', title: 'Clear desk and clear screen', description: 'Physical controls' },
  { code: 'A.7.8', title: 'Equipment siting and protection', description: 'Physical controls' },
  { code: 'A.7.9', title: 'Security of assets off-premises', description: 'Physical controls' },
  { code: 'A.7.10', title: 'Storage media', description: 'Physical controls' },
  { code: 'A.7.11', title: 'Supporting utilities', description: 'Physical controls' },
  { code: 'A.7.12', title: 'Cabling security', description: 'Physical controls' },
  { code: 'A.7.13', title: 'Equipment maintenance', description: 'Physical controls' },
  { code: 'A.7.14', title: 'Secure disposal or re-use of equipment', description: 'Physical controls' },
  { code: 'A.8.1', title: 'User endpoint devices', description: 'Technological controls' },
  { code: 'A.8.2', title: 'Privileged access rights', description: 'Technological controls' },
  { code: 'A.8.3', title: 'Information access restriction', description: 'Technological controls' },
  { code: 'A.8.4', title: 'Access to source code', description: 'Technological controls' },
  { code: 'A.8.5', title: 'Secure authentication', description: 'Technological controls' },
  { code: 'A.8.6', title: 'Capacity management', description: 'Technological controls' },
  { code: 'A.8.7', title: 'Protection against malware', description: 'Technological controls' },
  { code: 'A.8.8', title: 'Management of technical vulnerabilities', description: 'Technological controls' },
  { code: 'A.8.9', title: 'Configuration management', description: 'Technological controls' },
  { code: 'A.8.10', title: 'Information deletion', description: 'Technological controls' },
  { code: 'A.8.11', title: 'Data masking', description: 'Technological controls' },
  { code: 'A.8.12', title: 'Data leakage prevention', description: 'Technological controls' },
  { code: 'A.8.13', title: 'Information backup', description: 'Technological controls' },
  { code: 'A.8.14', title: 'Redundancy of information processing facilities', description: 'Technological controls' },
  { code: 'A.8.15', title: 'Logging', description: 'Technological controls' },
  { code: 'A.8.16', title: 'Monitoring activities', description: 'Technological controls' },
  { code: 'A.8.17', title: 'Clock synchronization', description: 'Technological controls' },
  { code: 'A.8.18', title: 'Use of privileged utility programs', description: 'Technological controls' },
  { code: 'A.8.19', title: 'Installation of software on operational systems', description: 'Technological controls' },
  { code: 'A.8.20', title: 'Networks security', description: 'Technological controls' },
  { code: 'A.8.21', title: 'Security of network services', description: 'Technological controls' },
  { code: 'A.8.22', title: 'Segregation of networks', description: 'Technological controls' },
  { code: 'A.8.23', title: 'Web filtering', description: 'Technological controls' },
  { code: 'A.8.24', title: 'Use of cryptography', description: 'Technological controls' },
  { code: 'A.8.25', title: 'Secure development life cycle', description: 'Technological controls' },
  { code: 'A.8.26', title: 'Application security requirements', description: 'Technological controls' },
  { code: 'A.8.27', title: 'Secure system architecture and engineering principles', description: 'Technological controls' },
  { code: 'A.8.28', title: 'Secure coding', description: 'Technological controls' },
  { code: 'A.8.29', title: 'Security testing in development and acceptance', description: 'Technological controls' },
  { code: 'A.8.30', title: 'Outsourced development', description: 'Technological controls' },
  { code: 'A.8.31', title: 'Separation of development, test and production environments', description: 'Technological controls' },
  { code: 'A.8.32', title: 'Change management', description: 'Technological controls' },
  { code: 'A.8.33', title: 'Test information', description: 'Technological controls' },
  { code: 'A.8.34', title: 'Protection of information systems during audit testing', description: 'Technological controls' },
];

// AICPA 2017 Trust Services Criteria: Security Common Criteria (CC1-CC9) plus the
// additive Availability, Confidentiality, Processing Integrity and Privacy criteria.
const SOC2_REQUIREMENTS = [
  { code: 'CC1', title: 'Control environment', description: 'Common Criteria (Security)' },
  { code: 'CC2', title: 'Communication and information', description: 'Common Criteria (Security)' },
  { code: 'CC3', title: 'Risk assessment', description: 'Common Criteria (Security)' },
  { code: 'CC4', title: 'Monitoring activities', description: 'Common Criteria (Security)' },
  { code: 'CC5', title: 'Control activities', description: 'Common Criteria (Security)' },
  { code: 'CC6', title: 'Logical and physical access controls', description: 'Common Criteria (Security)' },
  { code: 'CC7', title: 'System operations', description: 'Common Criteria (Security)' },
  { code: 'CC8', title: 'Change management', description: 'Common Criteria (Security)' },
  { code: 'CC9', title: 'Risk mitigation', description: 'Common Criteria (Security)' },
  { code: 'A1.1', title: 'Capacity management', description: 'Availability' },
  { code: 'A1.2', title: 'Environmental threats', description: 'Availability' },
  { code: 'A1.3', title: 'Recovery', description: 'Availability' },
  { code: 'C1.1', title: 'Identifying and maintaining confidential information', description: 'Confidentiality' },
  { code: 'C1.2', title: 'Disposing of confidential information', description: 'Confidentiality' },
  { code: 'PI1.1', title: 'Processing objectives and specifications', description: 'Processing Integrity' },
  { code: 'PI1.2', title: 'Input completeness and accuracy', description: 'Processing Integrity' },
  { code: 'PI1.3', title: 'Complete, accurate processing', description: 'Processing Integrity' },
  { code: 'PI1.4', title: 'Output completeness and delivery', description: 'Processing Integrity' },
  { code: 'PI1.5', title: 'Stored data completeness and accuracy', description: 'Processing Integrity' },
  { code: 'P1', title: 'Notice and communication of privacy policies', description: 'Privacy' },
  { code: 'P2', title: 'Choice and consent', description: 'Privacy' },
  { code: 'P3', title: 'Collection', description: 'Privacy' },
  { code: 'P4', title: 'Use, retention, and disposal', description: 'Privacy' },
  { code: 'P5', title: 'Access', description: 'Privacy' },
  { code: 'P6', title: 'Disclosure and notification', description: 'Privacy' },
  { code: 'P7', title: 'Quality', description: 'Privacy' },
  { code: 'P8', title: 'Monitoring and enforcement', description: 'Privacy' },
];

// GDPR core requirement articles (Regulation (EU) 2016/679).
const GDPR_REQUIREMENTS = [
  { code: 'Art.5', title: 'Principles relating to processing of personal data', description: 'Principles and lawful basis' },
  { code: 'Art.6', title: 'Lawfulness of processing', description: 'Principles and lawful basis' },
  { code: 'Art.7', title: 'Conditions for consent', description: 'Principles and lawful basis' },
  { code: 'Art.8', title: 'Conditions applicable to child’s consent', description: 'Principles and lawful basis' },
  { code: 'Art.9', title: 'Special categories of personal data', description: 'Principles and lawful basis' },
  { code: 'Art.10', title: 'Processing of criminal convictions and offences', description: 'Principles and lawful basis' },
  { code: 'Art.12', title: 'Transparent information, communication and modalities', description: 'Transparency and information' },
  { code: 'Art.13', title: 'Information to be provided where data collected from subject', description: 'Transparency and information' },
  { code: 'Art.14', title: 'Information to be provided where data not obtained from subject', description: 'Transparency and information' },
  { code: 'Art.15', title: 'Right of access', description: 'Rights of the data subject' },
  { code: 'Art.16', title: 'Right to rectification', description: 'Rights of the data subject' },
  { code: 'Art.17', title: 'Right to erasure', description: 'Rights of the data subject' },
  { code: 'Art.18', title: 'Right to restriction of processing', description: 'Rights of the data subject' },
  { code: 'Art.19', title: 'Notification obligation regarding rectification, erasure or restriction', description: 'Rights of the data subject' },
  { code: 'Art.20', title: 'Right to data portability', description: 'Rights of the data subject' },
  { code: 'Art.21', title: 'Right to object', description: 'Rights of the data subject' },
  { code: 'Art.22', title: 'Automated individual decision-making', description: 'Rights of the data subject' },
  { code: 'Art.24', title: 'Responsibility of the controller', description: 'Controller and processor' },
  { code: 'Art.25', title: 'Data protection by design and by default', description: 'Controller and processor' },
  { code: 'Art.26', title: 'Joint controllers', description: 'Controller and processor' },
  { code: 'Art.27', title: 'Representatives of controllers/processors not established in the EU', description: 'Controller and processor' },
  { code: 'Art.28', title: 'Processor / processing by a processor', description: 'Controller and processor' },
  { code: 'Art.29', title: 'Processing under the authority of controller/processor', description: 'Controller and processor' },
  { code: 'Art.30', title: 'Records of processing activities', description: 'Controller and processor' },
  { code: 'Art.31', title: 'Cooperation with the supervisory authority', description: 'Controller and processor' },
  { code: 'Art.32', title: 'Security of processing', description: 'Security and breaches' },
  { code: 'Art.33', title: 'Notification of breach to supervisory authority', description: 'Security and breaches' },
  { code: 'Art.34', title: 'Communication of breach to data subject', description: 'Security and breaches' },
  { code: 'Art.35', title: 'Data protection impact assessment', description: 'Security and breaches' },
  { code: 'Art.36', title: 'Prior consultation', description: 'Security and breaches' },
  { code: 'Art.37', title: 'Designation of the data protection officer', description: 'Data protection officer' },
  { code: 'Art.38', title: 'Position of the data protection officer', description: 'Data protection officer' },
  { code: 'Art.39', title: 'Tasks of the data protection officer', description: 'Data protection officer' },
  { code: 'Art.44', title: 'General principle for transfers', description: 'International transfers' },
  { code: 'Art.45', title: 'Transfers on the basis of adequacy decisions', description: 'International transfers' },
  { code: 'Art.46', title: 'Transfers subject to appropriate safeguards', description: 'International transfers' },
  { code: 'Art.47', title: 'Binding corporate rules', description: 'International transfers' },
  { code: 'Art.48', title: 'Transfers not authorised by Union or Member State law', description: 'International transfers' },
  { code: 'Art.49', title: 'Derogations for specific situations', description: 'International transfers' },
];

// Maps a framework name to its seeded requirement catalog.
const FRAMEWORK_REQUIREMENTS = {
  'ISO 27001': ISO_27001_REQUIREMENTS,
  'SOC 2': SOC2_REQUIREMENTS,
  'GDPR': GDPR_REQUIREMENTS,
};

/**
 * Seeds permissions, roles, the organization and an optional admin user.
 * @returns {void}
 */
/**
 * Ensure each bundled framework exists and carries its current authoritative
 * requirement catalog. Idempotent by requirement `code`: only requirements not
 * already present are inserted, so re-runs top up without duplicating or wiping
 * requirements an administrator may have customized.
 *
 * @returns {Promise<void>}
 */
async function seedFrameworkCatalog() {
  for (const [name, requirements] of Object.entries(FRAMEWORK_REQUIREMENTS)) {
    const framework = await prisma.framework.upsert({
      where: { name },
      update: {},
      create: { name, description: FRAMEWORK_DESCRIPTIONS[name] || null, enabled: false },
    });
    const existing = await prisma.frameworkRequirement.findMany({
      where: { frameworkId: framework.id },
      select: { code: true },
    });
    const existingCodes = new Set(existing.map((requirement) => requirement.code));
    const missing = requirements.filter((requirement) => !existingCodes.has(requirement.code));
    if (missing.length === 0) continue;
    await prisma.frameworkRequirement.createMany({
      data: missing.map((requirement) => ({
        frameworkId: framework.id,
        code: requirement.code,
        title: requirement.title,
        description: requirement.description || null,
      })),
    });
    console.log(`Seeded ${missing.length} requirements for ${name}`);
  }
}

async function main() {
  // Upsert each permission so re-running the seed is safe.
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description },
      create: p,
    });
  }
  console.log(`Seeded ${PERMISSIONS.length} permissions`);

  // Build a name to id map for connecting roles to permissions.
  const allPermissions = await prisma.permission.findMany();
  const byName = new Map(allPermissions.map((p) => [p.name, p.id]));

  for (const role of ROLES) {
    const permissionIds = role.permissions.map((name) => byName.get(name)).filter(Boolean);
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        description: role.description,
        // Replace the permission set so newly added permissions are linked even
        // when the role already exists from a previous seed run.
        permissions: { set: permissionIds.map((id) => ({ id })) },
      },
      create: {
        name: role.name,
        description: role.description,
        permissions: { connect: permissionIds.map((id) => ({ id })) },
      },
    });
  }
  console.log(`Seeded ${ROLES.length} roles`);

  // Ensure exactly one organization exists for this single-tenant deployment.
  const orgCount = await prisma.organization.count();
  if (orgCount === 0) {
    await prisma.organization.create({ data: { name: config.orgName } });
    console.log('Seeded organization');
  }

  // Seed the bundled compliance frameworks (disabled until enabled via API).
  for (const fw of FRAMEWORKS) {
    await prisma.framework.upsert({
      where: { name: fw.name },
      update: {},
      create: { name: fw.name, description: fw.description, enabled: false },
    });
  }
  // Seed each framework and its authoritative requirement catalog.
  await seedFrameworkCatalog();
  console.log(`Seeded ${FRAMEWORKS.length} frameworks and their requirement catalogs`);


  // Bootstrap an admin when credentials are provided and none exists yet.
  if (config.initialAdminEmail && config.initialAdminPassword) {
    const existing = await prisma.user.findUnique({
      where: { email: config.initialAdminEmail },
    });
    if (!existing) {
      const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
      const passwordHash = await bcrypt.hash(config.initialAdminPassword, 10);
      await prisma.user.create({
        data: {
          email: config.initialAdminEmail,
          passwordHash,
          roleId: adminRole.id,
          active: true,
        },
      });
      console.log(`Seeded initial admin: ${config.initialAdminEmail}`);
    }
  } else {
    // Otherwise guide the operator if the system has no users at all.
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log(
        'No users exist. Register the first user via /api/auth/register to obtain the admin role.'
      );
    }
  }
}

module.exports = { seedFrameworkCatalog };

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
