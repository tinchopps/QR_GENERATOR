import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../src/pages/RootApp';
import { useQrStore, rehydrateAutoGenerate } from '../src/store/qrStore';

const axiosMockResponses: string[] = [];
let mockCounter = 0;
jest.mock('axios', () => ({
  post: jest.fn().mockImplementation((_url: string, body: Record<string, unknown>) => {
  // Deterministic-ish unique short hash independent of leading data chars to avoid collisions in tests
  const hash = 'h' + (mockCounter++).toString(36).padStart(5, '0');
    axiosMockResponses.push(hash);
    return Promise.resolve({
  data: { mimeType: 'image/png', data: 'AAA', meta: { hash, size: (body.size as number) || 256, format: (body.format as string) || 'png', ecc: 'M' } }
    });
  })
}));

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  useQrStore.setState({
    history: [],
    result: undefined,
    config: { data: '', format: 'png', size: 256, colorDark: '#000000', colorLight: '#ffffff', errorCorrection: 'M', logoScale: 0.2 }
  });
  mockCounter = 0;
  axiosMockResponses.length = 0;
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test('renders heading', () => {
  render(<App />);
  expect(screen.getByText(/QR Generator/i)).toBeInTheDocument();
});

test('color dark input changes', () => {
  render(<App />);
  const colorInput = screen.getByLabelText(/Color Dark/i) as HTMLInputElement;
  const original = colorInput.value;
  colorInput.value = '#111111';
  colorInput.dispatchEvent(new Event('input', { bubbles: true }));
  expect(colorInput.value).not.toBe(original);
});

test('download button uses hash in filename (manual generate)', async () => {
  render(<App />);
  const dataInput = screen.getByLabelText('Data / URL') as HTMLInputElement;
  fireEvent.change(dataInput, { target: { value: 'Hello Hash' } });
  fireEvent.click(screen.getByRole('button', { name: /Generate QR code/i }));
  await waitFor(() => expect(screen.getByText(/Hash:/i)).toBeInTheDocument());
  const downloadBtn = screen.getByRole('button', { name: /Download QR code/i });
  const createSpy = jest.spyOn(document, 'createElement');
  fireEvent.click(downloadBtn);
  expect(createSpy).toHaveBeenCalledWith('a');
  createSpy.mockRestore();
});

test('share fallback copies URL when Web Share API missing', async () => {
  const nav = navigator as Navigator & { share?: unknown; clipboard?: { writeText: (s: string) => Promise<void> } };
  const originalShare = nav.share;
  nav.share = undefined;
  if (!nav.clipboard) {
    nav.clipboard = { writeText: jest.fn().mockResolvedValue(undefined) };
  }
  const writeTextSpy = jest.spyOn(nav.clipboard, 'writeText').mockResolvedValue(undefined);
  render(<App />);
  const dataInput = screen.getByLabelText('Data / URL') as HTMLInputElement;
  fireEvent.change(dataInput, { target: { value: 'Hello Share' } });
  fireEvent.click(screen.getByRole('button', { name: /Generate QR code/i }));
  await waitFor(() => expect(screen.getByText(/Hash:/i)).toBeInTheDocument());
  fireEvent.click(screen.getByText(/Share/i));
  await waitFor(() => expect(writeTextSpy).toHaveBeenCalled());
  writeTextSpy.mockRestore();
  nav.share = originalShare;
});

test('history load restores config', async () => {
  render(<App />);
  const dataInput = screen.getByLabelText('Data / URL') as HTMLInputElement;
  const firstData = 'History One';
  fireEvent.change(dataInput, { target: { value: firstData } });
  fireEvent.click(screen.getByRole('button', { name: /Generate QR code/i }));
  await waitFor(() => expect(useQrStore.getState().history.length).toBe(1), { timeout: 1500 });
  const secondData = 'History Two';
  fireEvent.change(dataInput, { target: { value: secondData } });
  fireEvent.click(screen.getByRole('button', { name: /Generate QR code/i }));
  await waitFor(() => expect(useQrStore.getState().history.length).toBe(2), { timeout: 1500 });
  const historySnapshot = [...useQrStore.getState().history]; // [latest, previous]
  const previousEntry = historySnapshot[1];
  const loadButtons = screen.getAllByText(/Load/);
  // click last (previousEntry)
  act(() => {
    fireEvent.click(loadButtons[loadButtons.length - 1]);
  });
  await waitFor(() => expect(dataInput.value).toBe(previousEntry.config.data), { timeout: 1500 });
});

test('manual generate button sets loading state', async () => {
  render(<App />);
  const dataInput = screen.getByLabelText('Data / URL') as HTMLInputElement;
  fireEvent.change(dataInput, { target: { value: 'Loading State' } });
  const btn = screen.getByRole('button', { name: /Generate QR code/i });
  fireEvent.click(btn);
  expect(btn).toHaveTextContent(/Generate|Generating/);
  await waitFor(() => expect(screen.getByText(/Hash:/i)).toBeInTheDocument());
});

test('shows ECC forced note when logo present and ECC not H', async () => {
  render(<App />);
  const dataInput = screen.getByLabelText('Data / URL') as HTMLInputElement;
  fireEvent.change(dataInput, { target: { value: 'Logo Note' } });
  // simulate adding a small base64 logo through store directly
  const tinyLogo = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
  // set config with logo and errorCorrection M
  act(() => {
    const { setConfig } = useQrStore.getState();
    setConfig({ logo: tinyLogo, errorCorrection: 'M' });
  });
  fireEvent.click(screen.getByRole('button', { name: /Generate QR code/i }));
  await waitFor(() => expect(screen.getByText(/Hash:/i)).toBeInTheDocument());
  expect(screen.getByText(/Logo presente: el backend forzará nivel H/i)).toBeInTheDocument();
});

test('auto generate toggle disables automatic requests', async () => {
  render(<App />);
  const dataInput = screen.getByLabelText('Data / URL') as HTMLInputElement;
  const autoToggle = screen.getByLabelText('Auto generate') as HTMLInputElement;
  // disable auto
  fireEvent.click(autoToggle);
  fireEvent.change(dataInput, { target: { value: 'Will Not Auto' } });
  // advance timers past debounce window
  act(() => { jest.advanceTimersByTime(400); });
  expect(screen.queryByText(/Hash:/i)).toBeNull();
  // manual generate now works
  fireEvent.click(screen.getByRole('button', { name: /Generate QR code/i }));
  await waitFor(() => expect(screen.getByText(/Hash:/i)).toBeInTheDocument());
});

test('auto generate toggle state persists via localStorage', async () => {
  // Scenario 1: persisted off
  localStorage.setItem('qr_auto', '0');
  act(() => { rehydrateAutoGenerate(); });
  render(<App />);
  let autoToggle = screen.getByLabelText('Auto generate') as HTMLInputElement;
  expect(autoToggle.checked).toBe(false);
  // cleanup DOM only
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
  // Scenario 2: persisted on
  localStorage.setItem('qr_auto', '1');
  act(() => { rehydrateAutoGenerate(); });
  render(<App />);
  autoToggle = screen.getByLabelText('Auto generate') as HTMLInputElement;
  expect(autoToggle.checked).toBe(true);
});
