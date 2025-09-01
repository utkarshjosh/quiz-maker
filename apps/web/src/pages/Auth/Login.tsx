import { useAuth } from '@/auth/AuthContext'

const Login = () => {
  const { login } = useAuth()
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body">
          <h2 className="card-title text-3xl mb-2" style={{
            background: 'linear-gradient(to right, #4FC3F7, #B388FF, #4AEDC4)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}>Welcome to QuizChamp</h2>
          <p className="text-base-content/70">Sign in to play quizzes and track your progress.</p>
          <div className="divider">Continue with</div>
          <div className="grid gap-2">
            <button className="btn btn-primary" onClick={() => login()}>Email</button>
            <button className="btn" onClick={() => login({ authorizationParams: { connection: 'google-oauth2' } })}>Google</button>
            <button className="btn" onClick={() => login({ authorizationParams: { connection: 'github' } })}>GitHub</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
