"use client";
import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const supabase = getBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          department,
          provider_type: "physician", // or capture from UI if you want
          requested_role: "viewer",    // always viewer by policy
        },
      },
    });
    if (error) return alert(error.message);
    router.push("/auth/check-email");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 p-4">
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="border p-2 w-full" />
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="border p-2 w-full" />
      <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Full name" className="border p-2 w-full" />
      <input value={department} onChange={e=>setDepartment(e.target.value)} placeholder="Department" className="border p-2 w-full" />
      <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">Sign Up</button>
    </form>
  );
}