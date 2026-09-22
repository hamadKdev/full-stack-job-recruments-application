import { apiClient } from './client';
import { AuthResponse } from '../types';

export interface SignupPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiClient<AuthResponse>('/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function signup(payload: SignupPayload): Promise<{ message: string; [key: string]: any }> {
  return apiClient('/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
