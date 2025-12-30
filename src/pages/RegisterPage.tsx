import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function RegisterPage() {
  const [code, setCode] = useState('');
  const [formError, setFormError] = useState('');
  const { sendMagicCode, verifyMagicCode, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const step = searchParams.get('step') || 'email';
  const email = searchParams.get('email') || '';
  const showCodeInput = step === 'code';

  const handleSendCode = () => {
    setFormError('');
    console.log('Submitting email:', email);
    if (email) {
      sendMagicCode(email).catch(e => console.log('Magic code send failed:', e));
    }
    setSearchParams({ step: 'code', email }, { replace: true });
    console.log('URL updated to step=code');
  };

  const handleVerifyCode = () => {
    setFormError('');

    verifyMagicCode(email, code)
      .then(() => navigate('/', { replace: true }))
      .catch(err => {
        console.error('Verification failed:', err);
        setFormError('Invalid code. Please try again.');
      });
  };

  const goBack = () => {
    setSearchParams({}, { replace: true });
    setCode('');
    setFormError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-accent mb-2">
            TaskPlanner
          </h1>
          <p className="text-textMuted">Create your account</p>
        </div>

        <div className="card">
          <div style={{ display: showCodeInput ? 'none' : 'block' }}>
            <p className="text-sm text-textMuted mb-4">Enter email to receive magic code</p>
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setSearchParams({ email: e.target.value }, { replace: true })}
                placeholder="Enter your email"
                required
                autoComplete="email"
              />

              {(error || formError) && (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                  {formError || error}
                </div>
              )}

              <Button onClick={handleSendCode} className="w-full" loading={isLoading}>
                Send Magic Code
              </Button>
            </div>
          </div>

          <div style={{ display: showCodeInput ? 'block' : 'none' }}>
            <p className="text-sm text-textMuted mb-4">
              Code sent to <span className="text-accent">{email}</span>
            </p>
            <div className="space-y-4">
              <Input
                label="Magic Code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                required
                autoFocus
              />

              {(error || formError) && (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                  {formError || error}
                </div>
              )}

              <Button onClick={handleVerifyCode} className="w-full" loading={isLoading}>
                Verify & Sign In
              </Button>

              <button
                type="button"
                onClick={goBack}
                className="w-full text-sm text-textMuted hover:text-text transition-colors"
              >
                Wrong email? Go back
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-textMuted text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-accent hover:underline transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
