import { AuthForm } from "@/components/auth-form"
import Link from "next/link"

export default function SignInPage() {
  return (
    <div className="w-full max-w-md space-y-4">
      <AuthForm mode="sign-in" />
      <p className="text-center text-sm text-gray-400">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="text-blue-400 hover:text-blue-300">
          Sign up
        </Link>
      </p>
    </div>
  )
}
