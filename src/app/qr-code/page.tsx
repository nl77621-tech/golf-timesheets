'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function QRCodePage() {
  const [appUrl, setAppUrl] = useState('')

  useEffect(() => {
    setAppUrl(window.location.origin + '/clock')
  }, [])

  const qrImageUrl = appUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(appUrl)}&size=300x300&margin=20&color=1a5e1a&bgcolor=ffffff`
    : ''

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto">
        {/* Back link */}
        <Link href="/" className="text-green-700 hover:underline text-sm mb-6 inline-block">
          ← Back to Dashboard
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">⛳</div>
            <h1 className="text-2xl font-bold text-gray-800">Employee Clock In/Out</h1>
            <p className="text-gray-500 mt-1">Post this QR code in the clubhouse</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            {qrImageUrl ? (
              <div className="border-4 border-green-700 rounded-2xl p-4 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrImageUrl}
                  alt="QR Code for clock in/out"
                  width={250}
                  height={250}
                  className="block"
                />
              </div>
            ) : (
              <div className="w-64 h-64 bg-gray-100 rounded-2xl flex items-center justify-center">
                <span className="text-gray-400">Loading...</span>
              </div>
            )}
          </div>

          {/* URL */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-center">
            <p className="text-xs text-gray-500 mb-1">Or visit directly:</p>
            <p className="text-green-700 font-mono text-sm break-all font-medium">{appUrl}</p>
          </div>

          {/* Instructions box */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-green-800 mb-2">How it works</h3>
            <ol className="text-green-700 text-sm space-y-1">
              <li>1. Employee scans QR code with their phone camera</li>
              <li>2. They tap their name from the list</li>
              <li>3. They tap <strong>Clock In</strong> at the start of shift</li>
              <li>4. They scan again and tap <strong>Clock Out</strong> when done</li>
              <li>5. Hours are automatically calculated and saved</li>
            </ol>
          </div>

          {/* Print button */}
          <button
            onClick={() => window.print()}
            className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-semibold text-lg transition-colors"
          >
            🖨️ Print QR Code
          </button>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
        }
      `}</style>
    </div>
  )
}
