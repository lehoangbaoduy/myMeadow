import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-meadowLight dark:bg-darkBg">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-meadowOrange">MyMeadow</h1>
          <p className="text-sm text-gray-500 mt-1">Rental Management</p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}