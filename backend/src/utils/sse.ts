import { Server } from 'http';
import { EventEmitter } from 'events';

class SSEManager extends EventEmitter {
  private clients: Map<string, any> = new Map();

  addClient(userId: string, res: any) {
    this.clients.set(userId, res);
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    
    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(`:keepalive\n\n`);
    }, 30000);
    
    // Clean up on disconnect
    res.on('close', () => {
      clearInterval(keepAlive);
      this.clients.delete(userId);
    });
  }

  sendToUser(userId: string, data: any) {
    const client = this.clients.get(userId);
    if (client) {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }

  broadcast(data: any) {
    this.clients.forEach(client => {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }

  sendToCompany(companyId: string, data: any) {
    // In production, maintain user->company mapping
    // For now, broadcast to all
    this.broadcast(data);
  }
}

export const sseManager = new SSEManager();

export function setupSSE(server: Server) {
  // Add SSE endpoint
  server.on('request', (req, res) => {
    if (req.url === '/api/events' && req.method === 'GET') {
      // Extract user ID from auth token
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.writeHead(401);
        res.end('Unauthorized');
        return;
      }
      
      // In production, validate token and extract userId
      const userId = 'demo-user'; // Placeholder
      
      sseManager.addClient(userId, res);
    }
  });
  
  // Listen to case events
  const { CaseService } = require('../services/CaseService');
  const caseService = new CaseService();
  
  caseService.on('case:created', (caseData) => {
    sseManager.broadcast({
      type: 'case:created',
      data: caseData,
      timestamp: new Date(),
    });
  });
  
  caseService.on('case:updated', (caseData) => {
    sseManager.broadcast({
      type: 'case:updated',
      data: caseData,
      timestamp: new Date(),
    });
  });
  
  caseService.on('case:assigned', (caseData) => {
    sseManager.broadcast({
      type: 'case:assigned',
      data: caseData,
      timestamp: new Date(),
    });
  });
}