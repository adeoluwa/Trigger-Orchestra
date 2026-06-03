import { DeployAnimation } from "@/components/deploy-animation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — animation panel */}
      <div className="hidden lg:block relative bg-zinc-950 overflow-hidden">
        {/* Subtle radial glow behind the terminal */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_80%,oklch(0.64_0.18_220/0.12),transparent)]" />
        <div className="relative z-10 h-full">
          <DeployAnimation />
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
