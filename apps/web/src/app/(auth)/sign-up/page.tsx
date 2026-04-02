import { AuthForm } from "@/components/auth-form"
import Link from "next/link"

export default function SignUpPage() {
  return (
    <div className="w-full max-w-md space-y-4">
      <AuthForm mode="sign-up" />
      <p className="text-center text-sm text-gray-400">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-blue-400 hover:text-blue-300">
          Sign in
        </Link>
      </p>
    </div>
  )
}
