import { ScannedFile, isJavaScriptFile, shouldIgnoreDirectory } from '../analyzer/scanner';

export interface GitHubRepoMeta {
  id: string;
  githubId: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export class GitHubService {
  private token?: string;

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN;
  }

  public async getUserRepositories(): Promise<GitHubRepoMeta[]> {
    if (this.token) {
      try {
        const res = await fetch('https://api.github.com/user/repos?per_page=100', {
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'NodeAtlas-SaaS'
          }
        });
        if (res.ok) {
          const data = await res.json();
          return data.map((repo: any) => ({
            id: `gh_${repo.id}`,
            githubId: String(repo.id),
            owner: repo.owner?.login || 'user',
            name: repo.name,
            fullName: repo.full_name,
            defaultBranch: repo.default_branch || 'main',
            url: repo.html_url,
            createdAt: repo.created_at,
            updatedAt: repo.updated_at
          }));
        }
      } catch {
        // Fallback
      }
    }

    return [
      {
        id: 'repo_nodeatlas_demo',
        githubId: '987654321',
        owner: 'nodeatlas-org',
        name: 'ecommerce-microservices-demo',
        fullName: 'nodeatlas-org/ecommerce-microservices-demo',
        defaultBranch: 'main',
        url: 'https://github.com/nodeatlas-org/ecommerce-microservices-demo',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: new Date().toISOString()
      }
    ];
  }

  public async getRepositoryTreeFiles(
    owner: string,
    repo: string,
    branch = 'main'
  ): Promise<ScannedFile[]> {
    if (this.token) {
      try {
        const treeRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
          {
            headers: {
              Authorization: `Bearer ${this.token}`,
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'NodeAtlas-SaaS'
            }
          }
        );

        if (treeRes.ok) {
          const data = await treeRes.json();
          const tree: any[] = data.tree || [];

          const filesToFetch = tree.filter((item) => {
            if (item.type !== 'blob') return false;
            const parts = item.path.split('/');
            if (parts.some((p: string) => shouldIgnoreDirectory(p))) return false;
            return isJavaScriptFile(item.path) || item.path.endsWith('package.json') || item.path.endsWith('package-lock.json');
          });

          const results: ScannedFile[] = [];

          for (const item of filesToFetch) {
            const rawRes = await fetch(
              `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`,
              {
                headers: { Authorization: `Bearer ${this.token}` }
              }
            );
            if (rawRes.ok) {
              const content = await rawRes.text();
              results.push({
                path: item.path,
                extension: item.path.slice(item.path.lastIndexOf('.')),
                content,
                size: item.size || content.length
              });
            }
          }

          if (results.length > 0) return results;
        }
      } catch {
        // Fallback
      }
    }

    return this.getDemoRepositoryFiles();
  }

  public getDemoRepositoryFiles(): ScannedFile[] {
    return DEMO_REPO_FILES;
  }
}

export const DEMO_REPO_FILES: ScannedFile[] = [
  {
    path: 'package.json',
    extension: '.json',
    size: 500,
    content: JSON.stringify({
      name: 'ecommerce-microservices-demo',
      version: '1.0.0',
      dependencies: {
        express: '^4.18.2',
        lodash: '^4.17.21',
        axios: '^1.6.0',
        dotenv: '^16.0.3'
      }
    }, null, 2)
  },
  {
    path: 'package-lock.json',
    extension: '.json',
    size: 1200,
    content: JSON.stringify({
      packages: {
        'node_modules/express': { version: '4.18.2' },
        'node_modules/lodash': { version: '4.17.21' },
        'node_modules/axios': { version: '1.6.0' },
        'node_modules/dotenv': { version: '16.0.3' }
      }
    }, null, 2)
  },
  { path: 'services/auth/index.js', extension: '.js', size: 300, content: `const express = require('express'); const { authenticateUser } = require('./auth-service'); const authController = require('./controllers/auth-controller'); module.exports = { authenticateUser, authController };` },
  { path: 'services/auth/auth-service.js', extension: '.js', size: 400, content: `const jwt = require('jsonwebtoken'); const { getUserById } = require('../users/user-service'); const { logActivity } = require('../../utils/logger'); function authenticateUser(token) { logActivity('Auth attempt'); return getUserById(123); } module.exports = { authenticateUser };` },
  { path: 'services/auth/controllers/auth-controller.js', extension: '.js', size: 350, content: `const { authenticateUser } = require('../auth-service'); const { formatResponse } = require('../../../utils/formatter'); function loginHandler(req, res) { const user = authenticateUser(req.body.token); return formatResponse(user); } module.exports = { loginHandler };` },
  { path: 'services/users/index.js', extension: '.js', size: 250, content: `const { getUserById } = require('./user-service'); module.exports = { getUserById };` },
  { path: 'services/users/user-service.js', extension: '.js', size: 500, content: `const lodash = require('lodash'); const { getOrdersByUserId } = require('../orders/order-service'); const { userModel } = require('./models/user-model'); function getUserById(id) { const orders = getOrdersByUserId(id); return lodash.assign({}, userModel, { id, orders }); } module.exports = { getUserById };` },
  { path: 'services/users/models/user-model.js', extension: '.js', size: 300, content: `const { validateUser } = require('../utils/user-validator'); const userModel = { name: 'Default User', role: 'customer' }; module.exports = { userModel, validateUser };` },
  { path: 'services/users/utils/user-validator.js', extension: '.js', size: 250, content: `const { getUserById } = require('../user-service'); function validateUser(user) { if (!user.id) return false; return Boolean(getUserById(user.id)); } module.exports = { validateUser };` },
  { path: 'services/orders/index.js', extension: '.js', size: 250, content: `const { getOrdersByUserId } = require('./order-service'); module.exports = { getOrdersByUserId };` },
  { path: 'services/orders/order-service.js', extension: '.js', size: 450, content: `const axios = require('axios'); const { processPayment } = require('../payments/payment-service'); const { orderController } = require('./controllers/order-controller'); function getOrdersByUserId(userId) { return [{ orderId: 99, status: 'completed' }]; } module.exports = { getOrdersByUserId, processPayment };` },
  { path: 'services/orders/controllers/order-controller.js', extension: '.js', size: 350, content: `const { getOrdersByUserId } = require('../order-service'); const { calculateTax } = require('../utils/tax-calculator'); function fetchOrders(req, res) { const orders = getOrdersByUserId(req.params.id); return orders.map(calculateTax); } module.exports = { fetchOrders };` },
  { path: 'services/orders/utils/tax-calculator.js', extension: '.js', size: 200, content: `const lodash = require('lodash'); function calculateTax(order) { return lodash.merge({}, order, { tax: 5.0 }); } module.exports = { calculateTax };` },
  { path: 'services/payments/index.js', extension: '.js', size: 250, content: `const { processPayment } = require('./payment-service'); module.exports = { processPayment };` },
  { path: 'services/payments/payment-service.js', extension: '.js', size: 400, content: `const axios = require('axios'); const { notifyCustomer } = require('./notifications/notifier'); function processPayment(amount) { notifyCustomer('Payment received'); return { success: true }; } module.exports = { processPayment };` },
  { path: 'services/payments/notifications/notifier.js', extension: '.js', size: 350, content: `const { processPayment } = require('../payment-service'); function notifyCustomer(msg) { console.log(msg); } module.exports = { notifyCustomer };` },
  { path: 'utils/logger.js', extension: '.js', size: 200, content: `const dotenv = require('dotenv'); function logActivity(msg) { console.log('[LOG]', msg); } module.exports = { logActivity };` },
  { path: 'utils/formatter.js', extension: '.js', size: 220, content: `const lodash = require('lodash'); function formatResponse(data) { return lodash.cloneDeep(data); } module.exports = { formatResponse };` },
  { path: 'utils/config.js', extension: '.js', size: 180, content: `const dotenv = require('dotenv'); module.exports = { port: process.env.PORT || 3000 };` },
  { path: 'utils/helper-a.js', extension: '.js', size: 150, content: `const helperB = require('./helper-b'); module.exports = { a: () => helperB.b() };` },
  { path: 'utils/helper-b.js', extension: '.js', size: 150, content: `const helperC = require('./helper-c'); module.exports = { b: () => helperC.c() };` },
  { path: 'utils/helper-c.js', extension: '.js', size: 150, content: `const helperA = require('./helper-a'); module.exports = { c: () => helperA.a() };` },
];
