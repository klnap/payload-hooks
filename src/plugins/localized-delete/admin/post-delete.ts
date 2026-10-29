import { formatAdminURL } from 'payload/shared'

import type { LocalizedDeleteRequestBody } from '#hooks/plugins/localized-delete/trash'

export const postLocalizedDelete = async ({
  api,
  collectionSlug,
  id,
  language,
  permanently,
}: {
  api: string
  collectionSlug: string
  id: string
  language: string
  permanently: boolean
}): Promise<{ ok: boolean; json: { errors?: { message: string }[]; message?: string } }> => {
  const deleteUrl = formatAdminURL({
    apiRoute: api,
    path: `/${collectionSlug}/${id}/localized-delete`,
  })
  const body: LocalizedDeleteRequestBody = { permanently }
  const res = await fetch(deleteUrl, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Accept-Language': language,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as { errors?: { message: string }[]; message?: string }
  return { ok: res.status < 400, json }
}
