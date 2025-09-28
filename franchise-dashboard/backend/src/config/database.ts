import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { Case } from '../models/Case';
import { SalesAccount } from '../models/SalesAccount';
import { Invoice } from '../models/Invoice';
import { Deposit } from '../models/Deposit';
import { CancelRequest } from '../models/CancelRequest';
import { Notification } from '../models/Notification';
import { InitialSchema1704067200000 } from '../migrations/001_initial_schema';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'franchise',
  password: process.env.DB_PASSWORD || 'franchise_dev',
  database: process.env.DB_NAME || 'franchise_db',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [
    User,
    Company,
    Case,
    SalesAccount,
    Invoice,
    Deposit,
    CancelRequest,
    Notification,
  ],
  migrations: [InitialSchema1704067200000],
  subscribers: [],
});