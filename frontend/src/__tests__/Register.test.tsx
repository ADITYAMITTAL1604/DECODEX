/**
 * Register page tests — form validation and error rendering.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Register from '../pages/Register';

// Mock the api module
vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}));

// Mock the logo import
vi.mock('../assets/decodex-logo.png', () => ({ default: 'mock-logo.png' }));

import { apiFetch } from '../lib/api';
const mockApiFetch = vi.mocked(apiFetch);

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
}

describe('Register Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the registration form', () => {
    renderRegister();
    
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('should show error message on API failure', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Unable to connect to Decodex backend'));

    renderRegister();
    
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/student name|your name/i), 'Test User');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'securepass123');
    
    const submitBtn = screen.getByRole('button', { name: /create.*account/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/unable to connect/i)).toBeInTheDocument();
    });
  });

  it('should show friendly error on network failure', async () => {
    mockApiFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    renderRegister();
    
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/student name|your name/i), 'Test User');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'securepass123');
    
    const submitBtn = screen.getByRole('button', { name: /create.*account/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('should toggle between student and parent account types', async () => {
    renderRegister();
    
    const user = userEvent.setup();
    const parentTab = screen.getByRole('tab', { name: /parent/i });
    await user.click(parentTab);

    // Grade level selector should disappear for parent
    expect(screen.queryByLabelText(/grade level/i)).not.toBeInTheDocument();
    
    // Switch back to student
    const studentTab = screen.getByRole('tab', { name: /student/i });
    await user.click(studentTab);
    
    expect(screen.getByLabelText(/grade level/i)).toBeInTheDocument();
  });
});
