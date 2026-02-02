import React from 'react'

interface Props {
  isUploading: boolean
  onPressRetry: () => void
}

const RetryButton = ({ isUploading, onPressRetry }: Props) => {
  return (
    <button
      onClick={onPressRetry}
      disabled={isUploading}
      className=' w-80 h-40 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors'
    >
      {isUploading ? (
        <>
          <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
          <span>Uploading...</span>
        </>
      ) : (
        <>
          <svg className='w-[50px] h-[50px]' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
            />
          </svg>
          <span className=' text-[50px]'>Retry</span>
        </>
      )}
    </button>
  )
}

export default RetryButton
