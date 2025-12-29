// Ambient declarations for qrcode module
declare module 'qrcode' {
	interface QRCodeOptions {
		type?: string;
		color?: { dark?: string; light?: string };
		errorCorrection?: 'L' | 'M' | 'Q' | 'H';
		width?: number;
	}
	export function toString(data: string, options?: QRCodeOptions): Promise<string>;
	export function toBuffer(data: string, options?: QRCodeOptions): Promise<Buffer>;
}
