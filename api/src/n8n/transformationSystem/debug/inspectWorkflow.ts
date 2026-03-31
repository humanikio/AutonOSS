/**
 * Debug script to inspect compiled workflow structure
 *
 * Usage: npx tsx src/n8n/transformationSystem/debug/inspectWorkflow.ts <workspaceId> <workflowId>
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const workspaceId = process.argv[2];
const workflowId = process.argv[3];

if (!workspaceId || !workflowId) {
  console.error('Usage: npx tsx src/n8n/transformationSystem/debug/inspectWorkflow.ts <workspaceId> <workflowId>');
  process.exit(1);
}

// Initialize Firebase (adjust path to your service account)
const app = initializeApp({
  credential: cert(require('../../../../serviceAccount.json'))
});

const db = getFirestore(app);

async function inspectWorkflow() {
  console.log(`\n🔍 Inspecting Workflow`);
  console.log(`   Workspace: ${workspaceId}`);
  console.log(`   Workflow: ${workflowId}`);

  // Fetch compiled workflow
  const compiledRef = db
    .collection('workspaces')
    .doc(workspaceId)
    .collection('n8n')
    .doc('buildSession')
    .collection('compiledWorkflow')
    .doc('main');

  const compiledSnap = await compiledRef.get();

  if (!compiledSnap.exists) {
    console.error('\n❌ No compiled workflow found');
    return;
  }

  const compiledData = compiledSnap.data();
  const nodes = compiledData?.nodes || [];
  const connections = compiledData?.connections || {};

  console.log(`\n📊 Workflow Structure:`);
  console.log(`   Nodes: ${nodes.length}`);
  console.log(`   Connections: ${Object.keys(connections).length}`);

  // Check for webhook triggers
  const webhookNodes = nodes.filter((n: any) =>
    n.type === 'n8n-nodes-base.webhook' || n.name?.includes('webhook')
  );
  console.log(`\n🎣 Webhook Triggers: ${webhookNodes.length}`);
  webhookNodes.forEach((node: any) => {
    console.log(`   - ${node.name} (${node.id})`);
    console.log(`     Type: ${node.type}`);
    console.log(`     Parameters:`, JSON.stringify(node.parameters, null, 2));
  });

  // Check for switch nodes
  const switchNodes = nodes.filter((n: any) =>
    n.type === 'n8n-nodes-base.switch' || n.type?.includes('switch')
  );
  console.log(`\n🔀 Switch Nodes: ${switchNodes.length}`);
  switchNodes.forEach((node: any) => {
    console.log(`   - ${node.name} (${node.id})`);
    console.log(`     Output expression:`, node.parameters?.output || 'MISSING');
    console.log(`     Number of outputs:`, node.parameters?.numberOutputs || 'MISSING');
  });

  // Check for orphaned nodes (not in connections)
  const connectedNodeIds = new Set<string>();
  Object.entries(connections).forEach(([sourceId, conns]: [string, any]) => {
    connectedNodeIds.add(sourceId);
    Object.values(conns).forEach((connArray: any) => {
      if (Array.isArray(connArray)) {
        connArray.forEach((conn: any) => {
          if (conn?.node) {
            connectedNodeIds.add(conn.node);
          }
        });
      }
    });
  });

  const orphanedNodes = nodes.filter((n: any) => !connectedNodeIds.has(n.name));

  if (orphanedNodes.length > 0) {
    console.log(`\n⚠️  Orphaned Nodes (not connected): ${orphanedNodes.length}`);
    orphanedNodes.forEach((node: any) => {
      console.log(`   - ${node.name} (${node.type})`);
    });
  }

  // Check connections structure
  console.log(`\n🔗 Connections:`);
  Object.entries(connections).forEach(([sourceId, conns]: [string, any]) => {
    const sourceNode = nodes.find((n: any) => n.name === sourceId);
    console.log(`\n   From: ${sourceId} (${sourceNode?.type || 'UNKNOWN'})`);

    Object.entries(conns).forEach(([outputIndex, connArray]: [string, any]) => {
      if (Array.isArray(connArray)) {
        console.log(`     Output ${outputIndex}:`);
        connArray.forEach((conn: any, idx: number) => {
          const targetNode = nodes.find((n: any) => n.name === conn.node);
          console.log(`       [${idx}] → ${conn.node} (${targetNode?.type || 'MISSING NODE'})`);
        });
      }
    });
  });

  // Check for invalid node references
  console.log(`\n🔍 Validating Node References:`);
  const nodeNames = new Set(nodes.map((n: any) => n.name));
  let invalidRefs = 0;

  Object.entries(connections).forEach(([sourceId, conns]: [string, any]) => {
    if (!nodeNames.has(sourceId)) {
      console.log(`   ❌ Source node not found: ${sourceId}`);
      invalidRefs++;
    }

    Object.values(conns).forEach((connArray: any) => {
      if (Array.isArray(connArray)) {
        connArray.forEach((conn: any) => {
          if (conn?.node && !nodeNames.has(conn.node)) {
            console.log(`   ❌ Target node not found: ${conn.node}`);
            invalidRefs++;
          }
        });
      }
    });
  });

  if (invalidRefs === 0) {
    console.log(`   ✅ All node references are valid`);
  } else {
    console.log(`   ❌ Found ${invalidRefs} invalid node references`);
  }

  // Summary
  console.log(`\n📋 Summary:`);
  console.log(`   Webhook triggers: ${webhookNodes.length > 0 ? '✅' : '❌ MISSING'}`);
  console.log(`   Switch nodes: ${switchNodes.length}`);
  console.log(`   Orphaned nodes: ${orphanedNodes.length}`);
  console.log(`   Invalid references: ${invalidRefs}`);
  console.log(`   Total nodes: ${nodes.length}`);
  console.log(`   Total connections: ${Object.keys(connections).length}`);

  if (webhookNodes.length === 0) {
    console.log(`\n⚠️  WARNING: No webhook trigger found - workflow cannot start!`);
  }

  if (invalidRefs > 0 || orphanedNodes.length > 0) {
    console.log(`\n⚠️  WARNING: Workflow has structural issues that may prevent execution!`);
  }
}

inspectWorkflow()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
