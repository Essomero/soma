import { cn } from "@/lib/utils";
import Button from "./Button";

interface NewsletterSignupProps {
  variant: "centered" | "brand" | "subtle" | "centered-light";
  className?: string;
}

export default function NewsletterSignup({
  variant,
  className,
}: NewsletterSignupProps) {
  if (variant === "brand") {
    return (
      <section
        className={cn(
          "bg-primary-container text-on-primary-container py-giant",
          className
        )}
      >
        <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop grid grid-cols-1 md:grid-cols-2 gap-xl items-center">
          <div>
            <h2 className="font-sora text-headline-md mb-md">
              Sign up for the newsletter
            </h2>
            <p className="font-dm-sans text-body-base text-on-primary-container/80">
              Deep dives into technology, economics, and philosophy : delivered when there's something worth reading.
            </p>
          </div>
          <form className="flex gap-sm">
            <input
              className="flex-grow bg-on-primary-container/10 border border-on-primary-container/30 text-on-primary-container placeholder:text-on-primary-container/50 rounded-lg p-md focus:ring-secondary focus:border-secondary"
              placeholder="email@address.com"
              type="email"
            />
            <Button variant="white" size="md" type="submit">
              Subscribe
            </Button>
          </form>
        </div>
      </section>
    );
  }

  if (variant === "subtle") {
    return (
      <section className={cn("py-giant", className)}>
        <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-xl bg-primary-container/10 border border-primary/20 rounded-2xl overflow-hidden relative">
            <div className="col-span-12 md:col-span-6 p-xxl relative z-10">
              <h2 className="font-sora text-headline-md mb-lg">
                The Soma Newsletter
              </h2>
              <p className="font-dm-sans text-xl text-on-surface-variant mb-xl">
                Deep dives into technology, economics, and philosophy. Right in your inbox.
              </p>
              <form className="flex flex-col sm:flex-row gap-md max-w-lg">
                <input
                  className="flex-grow bg-surface border border-border-default rounded-lg px-lg py-sm font-dm-sans focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-on-surface placeholder-on-surface-muted"
                  placeholder="Email address"
                  type="email"
                />
                <Button variant="brand" size="md" type="submit">
                  Subscribe
                </Button>
              </form>
            </div>
            <div className="hidden md:block col-span-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "radial-gradient(#fff 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "centered-light") {
    return (
      <section
        className={cn("bg-surface-container py-giant border-t border-border-default", className)}
      >
        <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-sora text-headline-md text-on-surface mb-md">
              Keep your skills sharp
            </h2>
            <p className="font-dm-sans text-body-base text-on-surface-variant mb-xl">
              Deep dives into ideas that matter : delivered when there's something worth reading.
            </p>
            <form className="flex flex-col md:flex-row gap-md justify-center">
              <input
                className="bg-surface border border-border-default px-lg py-md rounded-lg font-dm-sans w-full md:w-80 focus:border-primary focus:ring-0 outline-none text-on-surface placeholder-on-surface-muted"
                placeholder="you@example.com"
                type="email"
              />
              <Button variant="brand" size="md" type="submit">
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </section>
    );
  }

  // centered (homepage default)
  return (
    <section
      className={cn(
        "bg-surface-low border border-surface-bright rounded-2xl p-12 text-center",
        className
      )}
    >
      <h2 className="text-3xl font-extrabold mb-4">The Soma Newsletter</h2>
      <p className="text-on-surface-muted mb-8 max-w-xl mx-auto">
        AI-assisted deep research on technology, economics, philosophy, and beyond.
        Delivered when there's something worth reading.
      </p>
      <form className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
        <input
          className="flex-1 bg-surface-lowest border border-surface-bright rounded-md px-4 py-3 focus:ring-1 focus:ring-brand focus:border-brand text-on-surface placeholder-on-surface-muted"
          placeholder="Email address"
          type="email"
        />
        <Button variant="white" size="md" type="submit">
          Subscribe
        </Button>
      </form>
    </section>
  );
}
