import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: [] }),
    post: jest.fn().mockResolvedValue({}),
  },
}));

import App from './App';

test('renders login heading', () => {
  render(<App />);
  const heading = screen.getByText(/Ransomware Response Console/i);
  expect(heading).toBeInTheDocument();
});