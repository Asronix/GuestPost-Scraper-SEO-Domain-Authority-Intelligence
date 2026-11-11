/**
 * Google Sheets API Integration Service
 * Manages centralized spreadsheet creation, row updates, and bidirectional sync.
 */

import { GuestPost } from '../types.ts';

export const SHEET_HEADERS = [
  'Domain',
  'Root Domain',
  'Domain Authority',
  'PageRank',
  'Niche',
  'Country',
  'Page URL',
  'Contact Email',
  'Submission URL',
  'Free or Paid',
  'Status',
  'Discovered At',
  'Guidelines',
  'Notes'
];

export function postToSheetRow(post: GuestPost): (string | number)[] {
  return [
    post.domain,
    post.rootDomain,
    post.domainAuthority,
    post.pageRank,
    post.niche,
    post.country || post.countryCode || 'Singapore',
    post.pageUrl,
    post.contactEmail || '',
    post.submissionUrl || post.pageUrl,
    post.freeOrPaid,
    post.status,
    post.discoveredAt,
    post.guidelinesSummary,
    post.notes || ''
  ];
}

async function handleSheetsError(res: Response, defaultMessage: string): Promise<never> {
  if (res.status === 401) {
    throw new Error('Google authorization expired or required. Please reconnect your Google account.');
  }
  const errData = await res.json().catch(() => ({}));
  throw new Error(errData?.error?.message || `${defaultMessage} (HTTP ${res.status})`);
}

/**
 * Creates a brand-new centralized Google Sheet with formatted headers
 */
export async function createCentralizedSpreadsheet(
  accessToken: string,
  title: string = 'GuestPost Radar — Centralized Opportunities Database'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title
      },
      sheets: [
        {
          properties: {
            title: 'Guest Posts',
            gridProperties: {
              frozenRowCount: 1
            }
          }
        }
      ]
    })
  });

  if (!createRes.ok) {
    await handleSheetsError(createRes, 'Failed to create Google Sheet');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write header row
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Guest Posts!A1:M1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: 'Guest Posts!A1:M1',
        majorDimension: 'ROWS',
        values: [SHEET_HEADERS]
      })
    }
  );

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Syncs the entire current database to the Google Sheet (overwrites rows below header)
 */
export async function syncAllToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  posts: GuestPost[]
): Promise<void> {
  const rows = posts.map(postToSheetRow);
  const values = [SHEET_HEADERS, ...rows];

  // Clear existing sheet contents first
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Guest Posts!A1:Z5000:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  ).catch(() => {});

  // Write new data
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Guest Posts!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values
      })
    }
  );

  if (!res.ok) {
    await handleSheetsError(res, 'Failed to sync with Google Sheet');
  }
}

/**
 * Appends newly discovered rows to the Google Sheet
 */
export async function appendToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  newPosts: GuestPost[]
): Promise<void> {
  if (newPosts.length === 0) return;

  const rows = newPosts.map(postToSheetRow);
  let res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Guest Posts!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: rows
      })
    }
  );

  // If specific sheet name isn't found, fallback to default first sheet range
  if (!res.ok && res.status !== 401) {
    res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: rows
        })
      }
    );
  }

  if (!res.ok) {
    await handleSheetsError(res, 'Failed to append rows to Google Sheet');
  }
}

/**
 * Reads all rows from the Google Sheet and converts them into GuestPost objects
 */
export async function pullFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<Partial<GuestPost>[]> {
  let res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Guest Posts!A2:M`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  // Fallback to standard sheet range if 'Guest Posts' tab not found
  if (!res.ok && res.status !== 401) {
    res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A2:M`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
  }

  if (!res.ok) {
    await handleSheetsError(res, 'Failed to read from Google Sheet');
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  return rows.map((r) => {
    const hasCountryColumn = r[5] && !String(r[5]).startsWith('http');
    const country = hasCountryColumn ? String(r[5]) : 'Singapore';
    const offset = hasCountryColumn ? 1 : 0;

    return {
      domain: String(r[0] || ''),
      rootDomain: String(r[1] || r[0] || ''),
      domainAuthority: parseInt(r[2], 10) || 0,
      pageRank: parseFloat(r[3]) || 0,
      niche: String(r[4] || 'Beauty & Skincare'),
      country,
      pageUrl: String(r[5 + offset] || ''),
      contactEmail: r[6 + offset] ? String(r[6 + offset]) : undefined,
      submissionUrl: r[7 + offset] ? String(r[7 + offset]) : String(r[5 + offset] || ''),
      freeOrPaid: String(r[8 + offset] || 'Free Submission'),
      status: (['new', 'contacted', 'pitched', 'accepted', 'rejected'].includes(r[9 + offset])) ? r[9 + offset] : 'new',
      discoveredAt: r[10 + offset] ? String(r[10 + offset]) : new Date().toISOString(),
      guidelinesSummary: String(r[11 + offset] || ''),
      notes: r[12 + offset] ? String(r[12 + offset]) : ''
    };
  });
}
