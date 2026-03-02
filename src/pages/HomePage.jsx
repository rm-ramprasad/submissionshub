export default function HomePage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Profile Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">

          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white">
              RP
            </div>
          </div>

          {/* Name */}
          <h1 className="text-2xl font-bold text-white text-center mb-1">Ram Prasad</h1>
          <p className="text-sm text-blue-400 text-center mb-6">Open Terrace</p>

          {/* Details */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3">
              <span className="text-gray-400 text-sm w-16 shrink-0">Email</span>
              <span className="text-gray-100 text-sm">ramprasad@openterrace.in</span>
            </div>
            <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3">
              <span className="text-gray-400 text-sm w-16 shrink-0">Phone</span>
              <span className="text-gray-100 text-sm">+91 98765 43210</span>
            </div>
            <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3">
              <span className="text-gray-400 text-sm w-16 shrink-0">Company</span>
              <span className="text-gray-100 text-sm">Open Terrace</span>
            </div>
          </div>

          {/* Navigation */}
          <button
            onClick={() => onNavigate('solution-tables')}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            View Solution Tables
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
