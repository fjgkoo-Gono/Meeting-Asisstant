/**
 * Mobile-native file upload helpers.
 * Uses React Native FormData with URI objects for multipart uploads.
 *
 * Audio uploads use XMLHttpRequest instead of fetch so we can:
 *  - Set a long timeout (5 min) for large files on slow connections
 *  - Track upload progress and surface it to the user
 */

function getBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : '';
}

/**
 * Upload an audio file using XMLHttpRequest.
 * Unlike fetch, XHR lets us set a timeout and receive upload progress events,
 * which prevents silent failures when uploading large files on mobile networks.
 *
 * @param onProgress - called with a value 0–1 as the upload progresses
 */
export function uploadAudioMaterial(
  projectId: number,
  meetingId: number,
  uri: string,
  fileName: string,
  mimeType: string,
  contextNote?: string,
  onProgress?: (progress: number) => void,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/projects/${projectId}/meetings/${meetingId}/materials`;

    const formData = new FormData();
    formData.append('type', 'audio');
    formData.append('file', { uri, name: fileName, type: mimeType } as unknown as Blob);
    if (contextNote?.trim()) formData.append('contextNote', contextNote.trim());

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    // 5-minute timeout — large audio files (60+ MB) can take several minutes on
    // slow mobile connections. fetch has no timeout option; XHR does.
    xhr.timeout = 5 * 60 * 1000;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded / e.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve(xhr.responseText);
        }
      } else {
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.ontimeout = () => reject(new Error('Upload timed out — the file may be too large for your current connection'));

    xhr.send(formData);
  });
}

export async function uploadDocumentMaterial(
  projectId: number,
  meetingId: number,
  uri: string,
  fileName: string,
  mimeType: string,
  materialType: 'pdf' | 'excel' | 'pptx',
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
