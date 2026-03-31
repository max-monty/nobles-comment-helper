import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const { signIn, configError } = useAuth();
  const [error, setError] = useState(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    setError(null);
    setSigningIn(true);
    try {
      await signIn();
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="text-4xl mb-4">&#x1F4DD;</div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Comment Helper
          </h1>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Write thoughtful, personalized student comments with AI assistance.
          </p>

          {configError ? (
            <div className="text-left bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
              <p className="font-medium text-amber-800 mb-2">Firebase not configured</p>
              <p className="text-amber-700 text-xs leading-relaxed">
                Create a <code className="bg-amber-100 px-1 rounded">.env.local</code> file
                in the project root with your Firebase config values.
                See <code className="bg-amber-100 px-1 rounded">.env.example</code> for the required keys.
              </p>
            </div>
          ) : (
            <>
              <button
                onClick={handleSignIn}
                disabled={signingIn}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                {signingIn ? 'Signing in...' : 'Sign in with Google'}
              </button>

              {error && (
                <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {!configError && (
          <p className="text-center text-xs text-slate-400 mt-6">
            Sign in with your school Google account to get started.
          </p>
        )}
      </div>
    </div>
  );
}
