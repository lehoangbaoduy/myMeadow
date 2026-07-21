import Image from "next/image";
import ViewChooserClient from "./ViewChooserClient";

interface Props {
  searchParams: Promise<{ next?: string }>;
}

function sanitizeNext(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export default async function ChooseViewPage({ searchParams }: Props) {
  const { next } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-meadowLight dark:bg-darkBg px-4 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/logo.png" alt="MyMeadow" width={64} height={64} className="drop-shadow-sm" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">How would you like to view MyMeadow?</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
          You can switch anytime from your account menu — this only sets how this device shows the app.
        </p>
      </div>
      <ViewChooserClient next={sanitizeNext(next)} />
    </div>
  );
}
