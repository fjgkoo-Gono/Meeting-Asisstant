/**
 * Mobile-native file upload helpers.
 * Uses React Native FormData with URI objects for multipart uploads.
 */

function getBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : '';
}

export async function uploadDocumentMaterial(
  projectId: number,
  meetingId: number,
  uri: string,
  fileName: string,
  mimeType: string,
  materialType: 'pdf' | 'excel' | 'audio',
  contextNote?: string,
): Promise<unknown> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/projects/${projectId}/meetings/${meetingId}/materials`;

  const formData = new FormData();
  formData.append('type', materialType);
  formData.append('file', {
    uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
  if (contextNote?.trim()) formData.append('contextNote', contextNote.trim());

  const response = await globalThis.fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`Upload failed (${response.status}): ${text}`);
  }

  return response.json();
}

export async function uploadPhotoMaterial(
  projectId: number,
  meetingId: number,
  uri: string,
  fileName: string,
  mimeType: string,
  materialType: 'photo' | 'image' = 'photo',
  contextNote?: string,
): Promise<unknown> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/projects/${projectId}/meetings/${meetingId}/materials`;

  const formData = new FormData();
  formData.append('type', materialType);
  // React Native FormData accepts { uri, name, type } objects
  formData.append('file', {
    uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
  if (contextNote?.trim()) formData.append('contextNote', contextNote.trim());

  const response = await globalThis.fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`Upload failed (${response.status}): ${text}`);
  }

  return response.json();
}
