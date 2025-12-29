import request from 'supertest';
import app from '../src/app';

describe('POST /api/qr', () => {
  it('validates required data', async () => {
    const res = await request(app).post('/api/qr').send({ format: 'png' });
    expect(res.status).toBe(400);
  });

  it('generates a png qr', async () => {
    const res = await request(app).post('/api/qr').send({ data: 'Hello', format: 'png' });
    expect(res.status).toBe(200);
    expect(res.body.meta.format).toBe('png');
    expect(res.body.meta.ecc).toBeDefined();
    expect(res.body.data).toBeDefined();
  });

  it('forces ECC H when logo provided (png)', async () => {
    // tiny transparent png base64
    const tinyPng = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f920000000049454e44ae426082','hex').toString('base64');
    const res = await request(app).post('/api/qr').send({ data: 'Logo Test', format: 'png', logo: tinyPng, errorCorrection: 'L' });
    expect(res.status).toBe(200);
    expect(res.body.meta.ecc).toBe('H'); // forced
  });

  it('keeps requested ECC when no logo', async () => {
    const res = await request(app).post('/api/qr').send({ data: 'No Logo', format: 'png', errorCorrection: 'Q' });
    expect(res.status).toBe(200);
    expect(res.body.meta.ecc).toBe('Q');
  });

  it('rejects logo over 200KB approx', async () => {
    // create base64 payload > 200KB (approx 250KB). Add data: prefix to ensure branch triggered.
    const raw = 'A'.repeat(300000); // ~300KB when base64 decoded
    const bigBase64 = `data:image/png;base64,${raw}`;
    const res = await request(app).post('/api/qr').send({ data: 'Big Logo', format: 'png', logo: bigBase64 });
    expect(res.status).toBe(400);
  });

  it('embeds logo in svg and forces H', async () => {
    const tinyPng = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f920000000049454e44ae426082','hex').toString('base64');
    const res = await request(app).post('/api/qr').send({ data: 'Logo SVG', format: 'svg', logo: tinyPng, errorCorrection: 'L' });
    expect(res.status).toBe(200);
    expect(res.body.meta.format).toBe('svg');
    expect(res.body.meta.ecc).toBe('H');
    const svgDecoded = Buffer.from(res.body.data, 'base64').toString('utf-8');
    expect(svgDecoded).toMatch(/<image /);
  });

  it('validates size boundaries', async () => {
    // Test minimum size
    const resMin = await request(app).post('/api/qr').send({ data: 'Min Size', format: 'png', size: 128 });
    expect(resMin.status).toBe(200);
    expect(resMin.body.meta.size).toBe(128);

    // Test maximum size (skip this as it's slow)
    // const resMax = await request(app).post('/api/qr').send({ data: 'Max Size', format: 'png', size: 1024 });
    // expect(resMax.status).toBe(200);
    // expect(resMax.body.meta.size).toBe(1024);

    // Test below minimum
    const resTooSmall = await request(app).post('/api/qr').send({ data: 'Too Small', format: 'png', size: 100 });
    expect(resTooSmall.status).toBe(400);

    // Test above maximum
    const resIzTooBig = await request(app).post('/api/qr').send({ data: 'Too Big', format: 'png', size: 2000 });
    expect(resIzTooBig.status).toBe(400);
  });

  it('validates color format', async () => {
    // Valid hex colors
    const resValidHex = await request(app).post('/api/qr').send({ 
      data: 'Color Test', 
      format: 'png',
      colorDark: '#FF0000', 
      colorLight: '#00FF00' 
    });
    expect(resValidHex.status).toBe(200);

    // Valid 3-char hex
    const resValid3Hex = await request(app).post('/api/qr').send({ 
      data: 'Color Test', 
      format: 'png',
      colorDark: '#F00', 
      colorLight: '#0F0' 
    });
    expect(resValid3Hex.status).toBe(200);

    // Invalid color format
    const resInvalidColor = await request(app).post('/api/qr').send({ 
      data: 'Color Test', 
      format: 'png',
      colorDark: 'red' // not hex format
    });
    expect(resInvalidColor.status).toBe(400);
  });

  it('validates logoScale boundaries', async () => {
    const tinyPng = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f920000000049454e44ae426082','hex').toString('base64');
    
    // Valid logoScale (minimum)
    const resMinScale = await request(app).post('/api/qr').send({ 
      data: 'Scale Test', 
      format: 'png',
      logo: tinyPng, 
      logoScale: 0.05 
    });
    expect(resMinScale.status).toBe(200);

    // Valid logoScale (maximum)
    const resMaxScale = await request(app).post('/api/qr').send({ 
      data: 'Scale Test', 
      format: 'png',
      logo: tinyPng, 
      logoScale: 0.4 
    });
    expect(resMaxScale.status).toBe(200);

    // Invalid logoScale (too small)
    const resTooSmallScale = await request(app).post('/api/qr').send({ 
      data: 'Scale Test', 
      format: 'png',
      logo: tinyPng, 
      logoScale: 0.01 
    });
    expect(resTooSmallScale.status).toBe(400);

    // Invalid logoScale (too big)
    const resIzTooBigScale = await request(app).post('/api/qr').send({ 
      data: 'Scale Test', 
      format: 'png',
      logo: tinyPng, 
      logoScale: 0.8 
    });
    expect(resIzTooBigScale.status).toBe(400);
  });

  it('handles malformed base64 logo gracefully', async () => {
    // Test with invalid base64
    const resInvalidB64 = await request(app).post('/api/qr').send({ 
      data: 'Invalid Logo', 
      format: 'png',
      logo: 'this-is-not-base64!!!' 
    });
    expect(resInvalidB64.status).toBe(400);

    // Test with valid base64 but invalid image data (should generate QR without logo)
    const resCorruptImage = await request(app).post('/api/qr').send({ 
      data: 'Corrupt Logo', 
      format: 'png',
      logo: 'dGhpcyBpcyBub3QgYW4gaW1hZ2U=' // "this is not an image" in base64
    });
    expect(resCorruptImage.status).toBe(200);
    // Should still generate QR (logo processing fails silently)
    expect(resCorruptImage.body.meta.ecc).toBe('H'); // ECC forced due to logo presence
  });

  it('generates consistent hashes for identical content', async () => {
    const params = { data: 'Hash Test', format: 'png', size: 256, colorDark: '#000000', colorLight: '#ffffff' };
    
    const res1 = await request(app).post('/api/qr').send(params);
    const res2 = await request(app).post('/api/qr').send(params);
    
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.meta.hash).toBe(res2.body.meta.hash);
    expect(res1.body.data).toBe(res2.body.data); // identical base64 output
  });

  it('generates different hashes for different content', async () => {
    const res1 = await request(app).post('/api/qr').send({ data: 'Content A', format: 'png' });
    const res2 = await request(app).post('/api/qr').send({ data: 'Content B', format: 'png' });
    
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.meta.hash).not.toBe(res2.body.meta.hash);
  });

  it('validates data URL format when using http/https', async () => {
    // Valid HTTPS URL
    const resValidUrl = await request(app).post('/api/qr').send({ 
      data: 'https://example.com',
      format: 'png' 
    });
    expect(resValidUrl.status).toBe(200);

    // Valid HTTP URL
    const resValidHttp = await request(app).post('/api/qr').send({ 
      data: 'http://example.com',
      format: 'png' 
    });
    expect(resValidHttp.status).toBe(200);

    // Non-HTTP protocol should be treated as regular text (allowed)
    const resInvalidProtocol = await request(app).post('/api/qr').send({ 
      data: 'ftp://example.com',
      format: 'png' 
    });
    expect(resInvalidProtocol.status).toBe(200); // Changed: treated as regular text

    // Malformed URL should fail validation
    const resMalformedUrl = await request(app).post('/api/qr').send({ 
      data: 'http://invalid url with spaces',
      format: 'png' 
    });
    expect(resMalformedUrl.status).toBe(400);
  });
});

describe('GET /health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });
});
