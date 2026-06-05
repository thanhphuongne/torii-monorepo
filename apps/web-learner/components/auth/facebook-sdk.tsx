'use client'

import Script from 'next/script'
import { useEffect } from 'react'

export function FacebookSDK() {
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID

  useEffect(() => {
    if (!facebookAppId) return

    // Define the initialization function
    ;(window as any).fbAsyncInit = function () {
      ;(window as any).FB.init({
        appId: facebookAppId,
        cookie: true,
        xfbml: true,
        version: 'v18.0',
      })
    }
  }, [facebookAppId])

  if (!facebookAppId) return null

  return (
    <Script
      id="facebook-jssdk"
      src="https://connect.facebook.net/vi_VN/sdk.js"
      strategy="afterInteractive"
    />
  )
}
