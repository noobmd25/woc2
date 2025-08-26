"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName, department }),
    });
    if (!res.ok) {
      const data = await res.json();
      return alert(data.error || "Signup failed");
    }
    router.push("/auth/check-email");
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md p-6 space-y-4">
      <h1 className="text-xl font-semibold">Create account</h1>
      <input className="w-full border p-2 rounded" placeholder="Full name"
             value={fullName} onChange={e=>setFullName(e.target.value)} required />
      <input className="w-full border p-2 rounded" placeholder="Department"
             value={department} onChange={e=>setDepartment(e.target.value)} />
      <input type="email" className="w-full border p-2 rounded" placeholder="Email"
             value={email} onChange={e=>setEmail(e.target.value)} required />
      <input type="password" className="w-full border p-2 rounded" placeholder="Password"
             value={password} onChange={e=>setPassword(e.target.value)} required />
      <button className="w-full p-2 rounded bg-blue-600 text-white">Sign up</button>
      <p className="text-sm text-gray-600">
        You’ll be set to <b>pending</b> until an admin approves your account.
      </p>
    </form>
  );
}