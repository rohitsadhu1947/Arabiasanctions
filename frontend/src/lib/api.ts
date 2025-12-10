import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await api.post('/auth/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
  logout: async () => {
    localStorage.removeItem('access_token');
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Screening API
export const screeningApi = {
  screenSingle: async (data: ScreeningRequest) => {
    const response = await api.post('/screening/single', data);
    return response.data;
  },
  screenBulk: async (data: BulkScreeningRequest) => {
    const response = await api.post('/screening/bulk', data);
    return response.data;
  },
  getHistory: async (params?: ScreeningHistoryParams) => {
    const response = await api.get('/screening/history', { params });
    return response.data;
  },
  getResult: async (referenceId: string) => {
    const response = await api.get(`/screening/${referenceId}`);
    return response.data;
  },
  makeDecision: async (data: DecisionRequest) => {
    const response = await api.post('/screening/decision', data);
    return response.data;
  },
};

// Workflow API
export const workflowApi = {
  getDashboard: async () => {
    const response = await api.get('/workflow/dashboard');
    return response.data;
  },
  getCases: async (params?: CaseListParams) => {
    const response = await api.get('/workflow/cases', { params });
    return response.data;
  },
  getCase: async (caseId: number) => {
    const response = await api.get(`/workflow/cases/${caseId}`);
    return response.data;
  },
  performAction: async (caseId: number, data: WorkflowActionRequest) => {
    const response = await api.post(`/workflow/cases/${caseId}/action`, data);
    return response.data;
  },
  getCaseHistory: async (caseId: number) => {
    const response = await api.get(`/workflow/cases/${caseId}/history`);
    return response.data;
  },
};

// Reports API
export const reportsApi = {
  getScreeningSummary: async (params?: ReportParams) => {
    const response = await api.get('/reports/screening-summary', { params });
    return response.data;
  },
  getWorkflowSummary: async (params?: ReportParams) => {
    const response = await api.get('/reports/workflow-summary', { params });
    return response.data;
  },
  getAuditLog: async (params?: AuditLogParams) => {
    const response = await api.get('/reports/audit-log', { params });
    return response.data;
  },
  getCountryBreakdown: async (params?: ReportParams) => {
    const response = await api.get('/reports/country-breakdown', { params });
    return response.data;
  },
};

// Admin API
export const adminApi = {
  // Dashboard
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  },
  
  // Users
  getUsers: async (params?: UserListParams) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },
  getUser: async (userId: number) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },
  createUser: async (data: any) => {
    const response = await api.post('/admin/users', data);
    return response.data;
  },
  updateUser: async (userId: number, data: any) => {
    const response = await api.put(`/admin/users/${userId}`, data);
    return response.data;
  },
  
  // Roles
  getRoles: async () => {
    const response = await api.get('/admin/roles');
    return response.data;
  },
  createRole: async (data: any) => {
    const response = await api.post('/admin/roles', data);
    return response.data;
  },
  
  // Permissions
  getPermissions: async () => {
    const response = await api.get('/admin/permissions');
    return response.data;
  },
  
  // Countries & Branches
  getCountries: async () => {
    const response = await api.get('/admin/countries');
    return response.data;
  },
  getBranches: async (countryId?: number) => {
    const response = await api.get('/admin/branches', { params: { country_id: countryId } });
    return response.data;
  },
  
  // Sanctions Lists
  getSanctionsLists: async () => {
    const response = await api.get('/admin/sanctions-lists');
    return response.data;
  },
  getGlobalLists: async () => {
    const response = await api.get('/admin/sanctions-lists/global');
    return response.data;
  },
  getLocalLists: async () => {
    const response = await api.get('/admin/sanctions-lists/local');
    return response.data;
  },
  refreshList: async (listCode: string) => {
    const response = await api.post(`/admin/sanctions-lists/${listCode}/refresh`);
    return response.data;
  },
  toggleList: async (listCode: string, isActive: boolean) => {
    const response = await api.put(`/admin/sanctions-lists/${listCode}/toggle`, null, {
      params: { is_active: isActive }
    });
    return response.data;
  },
  getListEntries: async (listCode: string, params?: { page?: number; page_size?: number; search?: string }) => {
    const response = await api.get(`/admin/sanctions-lists/${listCode}/entries`, { params });
    return response.data;
  },
  addListEntry: async (listCode: string, data: any) => {
    const response = await api.post(`/admin/sanctions-lists/${listCode}/entries`, data);
    return response.data;
  },
  removeListEntry: async (listCode: string, sourceId: string) => {
    const response = await api.delete(`/admin/sanctions-lists/${listCode}/entries/${sourceId}`);
    return response.data;
  },
  
  // Audit Logs
  getAuditLogs: async (params?: AuditLogParams) => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
  },
  getAuditStats: async (params?: { from_date?: string; to_date?: string }) => {
    const response = await api.get('/admin/audit-logs/stats', { params });
    return response.data;
  },
  exportAuditLogs: async (format: 'csv' | 'json', params?: { from_date?: string; to_date?: string }) => {
    const response = await api.get('/admin/audit-logs/export', {
      params: { format, ...params },
      responseType: 'blob',
    });
    return response.data;
  },
  
  // System Config
  getConfig: async () => {
    const response = await api.get('/admin/config');
    return response.data;
  },
  updateConfig: async (data: any) => {
    const response = await api.put('/admin/config', data);
    return response.data;
  },
};

// Types
export interface ScreeningRequest {
  entity_type: 'individual' | 'corporate';
  country_code: string;
  branch_code?: string;
  individual?: {
    full_name: string;
    date_of_birth?: string;
    nationality?: string;
    national_id?: string;
    passport_number?: string;
  };
  corporate?: {
    company_name: string;
    registration_number?: string;
    registration_country?: string;
  };
  sanction_lists?: string[];
  match_threshold?: number;
}

export interface BulkScreeningRequest {
  requests: ScreeningRequest[];
  batch_reference?: string;
}

export interface DecisionRequest {
  match_id: number;
  decision: 'release' | 'flag' | 'escalate' | 'false_positive' | 'true_match';
  reason_code?: string;
  reason_text?: string;
}

export interface WorkflowActionRequest {
  action_type: 'assign' | 'review' | 'approve' | 'reject' | 'escalate' | 'return' | 'comment';
  comment?: string;
  assign_to_user_id?: number;
  escalation_reason?: string;
  decision?: string;
}

export interface ScreeningHistoryParams {
  page?: number;
  page_size?: number;
  name_contains?: string;
  entity_type?: string;
  risk_level?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
}

export interface CaseListParams {
  page?: number;
  page_size?: number;
  status?: string;
  priority?: string;
  assigned_to_me?: boolean;
  sla_breached?: boolean;
}

export interface ReportParams {
  from_date?: string;
  to_date?: string;
  country_code?: string;
}

export interface AuditLogParams {
  page?: number;
  page_size?: number;
  category?: string;
  action?: string;
  user_email?: string;
  country_code?: string;
  resource_type?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
}

export interface UserListParams {
  page?: number;
  page_size?: number;
  search?: string;
  country_id?: number;
  is_active?: boolean;
}
