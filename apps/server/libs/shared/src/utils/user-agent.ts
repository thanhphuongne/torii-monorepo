/**
 * Simple User Agent Parser to extract OS and Browser
 */
export function parseUserAgent(ua: string | undefined): string {
  if (!ua) return 'Unknown Device';

  const browserNames = [
    { name: 'Chrome', reg: /Chrome\/([0-9\.]+)/ },
    { name: 'Firefox', reg: /Firefox\/([0-9\.]+)/ },
    { name: 'Safari', reg: /Version\/([0-9\.]+).*Safari/ },
    { name: 'Opera', reg: /OPR\/([0-9\.]+)/ },
    { name: 'Edge', reg: /Edg\/([0-9\.]+)/ },
    { name: 'IE', reg: /Trident\/.*rv:([0-9\.]+)/ },
  ];

  const osNames = [
    { name: 'Windows', reg: /Windows NT ([0-9\._]+)/ },
    { name: 'macOS', reg: /Mac OS X ([0-9\._]+)/ },
    { name: 'iOS', reg: /(iPhone|iPad|iPod).*OS ([0-9\._]+)/ },
    { name: 'Android', reg: /Android ([0-9\._]+)/ },
    { name: 'Linux', reg: /Linux/ },
  ];

  let browser = '';
  for (const b of browserNames) {
    const match = ua.match(b.reg);
    if (match) {
      browser = b.name; // + ' ' + match[1].split('.')[0];
      break;
    }
  }

  let os = '';
  for (const o of osNames) {
    const match = ua.match(o.reg);
    if (match) {
      os = o.name;
      break;
    }
  }

  if (browser && os) return `${browser} on ${os}`;
  if (browser) return browser;
  if (os) return os;

  if (ua.includes('PostmanRuntime')) return 'Postman';
  
  return 'Unknown Device';
}
