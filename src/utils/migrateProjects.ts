// src/utils/migrateProjects.ts
// Run this once to migrate existing projects to the new multi-contractor/client format

import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Migration script to update existing projects to support multiple contractors and clients.
 * 
 * This script:
 * 1. Reads all existing projects
 * 2. For each project, ensures clientIds and contractorIds arrays exist
 * 3. Populates the arrays with the existing clientId and contractorId values
 * 
 * Run this once after deploying the new schema.
 */
export const migrateProjectsToMultiAssignment = async () => {
  console.log('Starting project migration...');
  
  try {
    const projectsRef = collection(db, 'projects');
    const snapshot = await getDocs(projectsRef);
    
    if (snapshot.empty) {
      console.log('No projects found to migrate.');
      return { success: true, migratedCount: 0 };
    }

    const batch = writeBatch(db);
    let migratedCount = 0;
    let skippedCount = 0;

    snapshot.docs.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const projectRef = doc(db, 'projects', docSnapshot.id);
      
      // Check if migration is needed
      const needsClientIdsMigration = !data.clientIds || !Array.isArray(data.clientIds);
      const needsContractorIdsMigration = !data.contractorIds || !Array.isArray(data.contractorIds);
      
      if (!needsClientIdsMigration && !needsContractorIdsMigration) {
        skippedCount++;
        return;
      }

      const updates: any = {};

      // Migrate clientIds
      if (needsClientIdsMigration) {
        updates.clientIds = data.clientId ? [data.clientId] : [];
      }

      // Migrate contractorIds
      if (needsContractorIdsMigration) {
        updates.contractorIds = data.contractorId ? [data.contractorId] : [];
      }

      batch.update(projectRef, updates);
      migratedCount++;
      
      console.log(`Queued migration for project: ${data.title || docSnapshot.id}`);
    });

    if (migratedCount > 0) {
      await batch.commit();
      console.log(`Migration complete! Migrated ${migratedCount} projects, skipped ${skippedCount}.`);
    } else {
      console.log(`No migration needed. All ${skippedCount} projects already have the new format.`);
    }

    return { success: true, migratedCount, skippedCount };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error };
  }
};

/**
 * Validate that all projects have the required fields
 */
export const validateProjectSchema = async () => {
  console.log('Validating project schema...');
  
  try {
    const projectsRef = collection(db, 'projects');
    const snapshot = await getDocs(projectsRef);
    
    const issues: Array<{ projectId: string; title: string; issues: string[] }> = [];

    snapshot.docs.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const projectIssues: string[] = [];

      // Check required fields
      if (!data.clientId) projectIssues.push('Missing clientId');
      if (!data.contractorId) projectIssues.push('Missing contractorId');
      if (!data.clientIds || !Array.isArray(data.clientIds)) projectIssues.push('Missing or invalid clientIds array');
      if (!data.contractorIds || !Array.isArray(data.contractorIds)) projectIssues.push('Missing or invalid contractorIds array');
      
      // Check consistency
      if (data.clientId && data.clientIds && !data.clientIds.includes(data.clientId)) {
        projectIssues.push('Primary clientId not in clientIds array');
      }
      if (data.contractorId && data.contractorIds && !data.contractorIds.includes(data.contractorId)) {
        projectIssues.push('Primary contractorId not in contractorIds array');
      }

      if (projectIssues.length > 0) {
        issues.push({
          projectId: docSnapshot.id,
          title: data.title || 'Untitled',
          issues: projectIssues
        });
      }
    });

    if (issues.length === 0) {
      console.log('All projects pass schema validation!');
    } else {
      console.log(`Found ${issues.length} projects with schema issues:`);
      issues.forEach(({ projectId, title, issues: projectIssues }) => {
        console.log(`  - ${title} (${projectId}): ${projectIssues.join(', ')}`);
      });
    }

    return { valid: issues.length === 0, issues };
  } catch (error) {
    console.error('Validation failed:', error);
    return { valid: false, error };
  }
};

/**
 * Fix any inconsistencies in the project data
 */
export const fixProjectInconsistencies = async () => {
  console.log('Fixing project inconsistencies...');
  
  try {
    const projectsRef = collection(db, 'projects');
    const snapshot = await getDocs(projectsRef);
    
    const batch = writeBatch(db);
    let fixedCount = 0;

    snapshot.docs.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const projectRef = doc(db, 'projects', docSnapshot.id);
      const updates: any = {};
      let needsUpdate = false;

      // Ensure arrays exist
      let clientIds = data.clientIds || [];
      let contractorIds = data.contractorIds || [];

      // Ensure primary IDs are in the arrays
      if (data.clientId && !clientIds.includes(data.clientId)) {
        clientIds = [data.clientId, ...clientIds];
        updates.clientIds = clientIds;
        needsUpdate = true;
      }

      if (data.contractorId && !contractorIds.includes(data.contractorId)) {
        contractorIds = [data.contractorId, ...contractorIds];
        updates.contractorIds = contractorIds;
        needsUpdate = true;
      }

      // If no primary but array has values, set first as primary
      if (!data.clientId && clientIds.length > 0) {
        updates.clientId = clientIds[0];
        needsUpdate = true;
      }

      if (!data.contractorId && contractorIds.length > 0) {
        updates.contractorId = contractorIds[0];
        needsUpdate = true;
      }

      if (needsUpdate) {
        batch.update(projectRef, updates);
        fixedCount++;
        console.log(`Queued fix for project: ${data.title || docSnapshot.id}`);
      }
    });

    if (fixedCount > 0) {
      await batch.commit();
      console.log(`Fixed ${fixedCount} projects.`);
    } else {
      console.log('No fixes needed.');
    }

    return { success: true, fixedCount };
  } catch (error) {
    console.error('Fix failed:', error);
    return { success: false, error };
  }
};

// Export a convenience function to run all migration steps
export const runFullMigration = async () => {
  console.log('=== Starting Full Migration ===\n');
  
  // Step 1: Migrate to new format
  console.log('Step 1: Migrating projects to new format...');
  const migrateResult = await migrateProjectsToMultiAssignment();
  console.log('');
  
  // Step 2: Fix any inconsistencies
  console.log('Step 2: Fixing inconsistencies...');
  const fixResult = await fixProjectInconsistencies();
  console.log('');
  
  // Step 3: Validate
  console.log('Step 3: Validating schema...');
  const validateResult = await validateProjectSchema();
  console.log('');
  
  console.log('=== Migration Complete ===');
  
  return {
    migration: migrateResult,
    fixes: fixResult,
    validation: validateResult
  };
};