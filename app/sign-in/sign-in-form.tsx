"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { authClient } from "../../lib/auth-client";

export default function SignInForm({ available }: { available: boolean }) {
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!available || busy) return;
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const email = String(data.get("email"));
      const password = String(data.get("password"));
      const result = signup
        ? await authClient.signUp.email({
            email,
            password,
            name: String(data.get("name")),
          })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(
          signup
            ? "Inscription impossible. Vérifie tes informations ou essaie de te connecter."
            : "Connexion impossible. Vérifie ton e-mail et ton mot de passe.",
        );
        return;
      }
      localStorage.setItem("happen-mode", "live");
      const invite = new URLSearchParams(window.location.search).get("invite");
      router.replace(
        "/?space=live" +
          (invite ? "&invite=" + encodeURIComponent(invite) : ""),
      );
    } catch {
      setError("La connexion est indisponible. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <Link className="text-link auth-back" href="/">
        <ArrowLeft size={15} /> Retour à Happen
      </Link>
      <div className="auth-layout">
        <section className="auth-story">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <i />
              <i />
              <i />
              <i />
            </span>
            happen<span className="brand-dot">.</span>
          </Link>
          <span className="eyebrow">TON PROCHAIN NIVEAU T’ATTEND</span>
          <h1>
            Tout commence
            <br />
            par <em>un petit pas.</em>
          </h1>
          <p>
            Les formations que vous finissez.
            <br />
            Les projets que vous livrez.
            <br />
            Et le crew qui vous pousse à continuer.
          </p>
          <ul>
            {[
              "Une room pour tes potes",
              "Des objectifs qui se concrétisent",
              "Des progrès qu’on partage",
            ].map((text) => (
              <li key={text}>
                <Check size={15} />
                {text}
              </li>
            ))}
          </ul>
        </section>
        <section className="panel auth-card">
          <span className="modal-kicker">BIENVENUE DANS LE CREW</span>
          <h2>{signup ? "Crée ton espace." : "Content de te revoir."}</h2>
          <p className="modal-intro">
            {signup
              ? "Un compte à toi. Des compétences à construire ensemble."
              : "Tes objectifs et ton crew t’attendent."}
          </p>
          {!available ? (
            <>
              <p className="form-note">
                <ShieldCheck size={18} />
                L’espace partagé est en cours de préparation. Tu peux déjà
                découvrir Happen dans la démo interactive.
              </p>
              <Link className="btn primary submit" href="/">
                Explorer la démo <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <>
              <form onSubmit={submit}>
                {signup && (
                  <label>
                    Ton prénom
                    <input
                      name="name"
                      autoComplete="given-name"
                      required
                      maxLength={60}
                      placeholder="Comment le crew t’appelle ?"
                    />
                  </label>
                )}
                <label>
                  Ton e-mail
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    placeholder="toi@exemple.com"
                  />
                </label>
                <label>
                  Ton mot de passe
                  <input
                    name="password"
                    type="password"
                    autoComplete={signup ? "new-password" : "current-password"}
                    minLength={12}
                    maxLength={128}
                    required
                    placeholder={
                      signup ? "Au moins 12 caractères" : "Ton mot de passe"
                    }
                  />
                </label>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <button className="btn primary submit" disabled={busy}>
                  {busy
                    ? "Un instant…"
                    : signup
                      ? "Créer mon compte"
                      : "Me connecter"}
                  <ArrowRight size={16} />
                </button>
              </form>
              <button
                className="text-link auth-toggle"
                disabled={busy}
                onClick={() => {
                  setSignup(!signup);
                  setError("");
                }}
              >
                {signup
                  ? "Déjà dans le crew ? Me connecter"
                  : "Pas encore de compte ? Rejoindre Happen"}
              </button>
            </>
          )}
          <div className="auth-footnote">
            <ShieldCheck size={14} />
            Tes rooms restent accessibles aux membres invités.
          </div>
        </section>
      </div>
    </main>
  );
}
