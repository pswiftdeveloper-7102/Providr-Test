"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import {
  BrandedSelectItem,
  BrandedSelectTrigger,
} from "@/components/branded-select";
import { Separator } from "@/components/ui/separator";
import { PasswordInput } from "@/components/password-input";
import { cn } from "@/lib/utils";
import {
  COUNTRY_CODES,
  DEFAULT_COUNTRY_ISO,
  findCountry,
} from "@/lib/country-codes";

import { signupAction, type SignupState } from "./actions";

const initialState: SignupState = {};

type Step = 1 | 2;

type Props = {
  googleEnabled: boolean;
  onGoogle: () => Promise<void>;
};

export function SignupForm({ googleEnabled, onGoogle }: Props) {
  const [state, formAction, pending] = useActionState(
    signupAction,
    initialState
  );
  const [step, setStep] = useState<Step>(1);

  // Step 1 fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2 fields
  const [signUpAs, setSignUpAs] = useState<"PROVIDER" | "SC" | "">("");
  const [companyLegalName, setCompanyLegalName] = useState("");
  const [companyTradingName, setCompanyTradingName] = useState("");
  const [abn, setAbn] = useState("");
  const [isNdisRegistered, setIsNdisRegistered] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [clientStepErrors, setClientStepErrors] = useState<
    Record<string, string>
  >({});
  // Tracks fields the user has touched since the last server response, so
  // the stale server error disappears as soon as they edit/select.
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  // When the server action returns a fieldError on step 1, jump back to step 1.
  useEffect(() => {
    if (state.failedStep && state.failedStep !== step) {
      setStep(state.failedStep);
    }
    // New server response — reset which fields are considered dirty.
    setDirty(new Set());
  }, [state, step]);

  const markDirty = (key: string) =>
    setDirty((d) => {
      if (d.has(key)) return d;
      const next = new Set(d);
      next.add(key);
      return next;
    });

  const fieldError = (key: string) => {
    // Client-side errors always show — they're current.
    if (clientStepErrors[key]) return clientStepErrors[key];
    // Server errors hide as soon as the user edits the field.
    if (dirty.has(key)) return undefined;
    return state.fieldErrors?.[key];
  };

  const country = findCountry(countryIso) ?? findCountry(DEFAULT_COUNTRY_ISO)!;

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = "First name is required.";
    if (!lastName.trim()) errs.lastName = "Last name is required.";
    if (!email.trim()) errs.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Please enter a valid email address.";
    if (!phoneNumber.trim()) errs.phoneNumber = "Phone number is required.";
    else if (!/^[0-9 ]+$/.test(phoneNumber))
      errs.phoneNumber = "Phone number can only contain digits.";
    if (password.length < 8)
      errs.password = "Password must be at least 8 characters.";
    if (confirmPassword !== password)
      errs.confirmPassword = "Passwords do not match.";

    setClientStepErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onNext = () => {
    if (validateStep1()) {
      setClientStepErrors({});
      setStep(2);
    }
  };

  return (
    <div className="space-y-6">
      <form action={formAction}>
      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between">
            <CardTitle>Create Account</CardTitle>
            <span className="text-xs font-medium text-muted-foreground">
              Step {step} of 2
            </span>
          </div>
          <CardDescription>
            {step === 1
              ? "Tell us about you."
              : "Tell us about your organisation."}
          </CardDescription>
          <StepIndicator step={step} />
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Step 1 */}
          <div className={cn("space-y-4", step !== 1 && "hidden")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell label="First name" required error={fieldError("firstName")}>
                <Input
                  name="firstName"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    markDirty("firstName");
                  }}
                  autoComplete="given-name"
                  aria-invalid={!!fieldError("firstName")}
                />
              </FieldShell>
              <FieldShell label="Last name" required error={fieldError("lastName")}>
                <Input
                  name="lastName"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    markDirty("lastName");
                  }}
                  autoComplete="family-name"
                  aria-invalid={!!fieldError("lastName")}
                />
              </FieldShell>
            </div>

            <FieldShell label="Email address" required error={fieldError("email")}>
              <Input
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  markDirty("email");
                }}
                autoComplete="email"
                placeholder="you@org.com.au"
                aria-invalid={!!fieldError("email")}
              />
            </FieldShell>

            <div className="space-y-2">
              <Label>
                Phone number<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Select
                  name="phoneCountryIso"
                  value={countryIso}
                  onValueChange={(v) => {
                    if (v) {
                      setCountryIso(v);
                      markDirty("phoneCountryIso");
                    }
                  }}
                >
                  <BrandedSelectTrigger
                    aria-label="Country code"
                    className="w-[140px] justify-between"
                  >
                    <SelectValue>
                      <span aria-hidden className="text-base leading-none">
                        {country.flag}
                      </span>
                      <span className="font-medium">+{country.dialCode}</span>
                    </SelectValue>
                  </BrandedSelectTrigger>
                  <SelectContent className="min-w-[260px]">
                    {COUNTRY_CODES.map((c) => (
                      <BrandedSelectItem key={c.iso} value={c.iso}>
                        <span aria-hidden className="mr-2 text-base leading-none">
                          {c.flag}
                        </span>
                        <span className="flex-1">{c.name}</span>
                        <span className="ml-3 text-xs text-muted-foreground tabular-nums">
                          +{c.dialCode}
                        </span>
                      </BrandedSelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  name="phoneNumber"
                  type="tel"
                  inputMode="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    markDirty("phoneNumber");
                  }}
                  autoComplete="tel-national"
                  placeholder="412 345 678"
                  className="flex-1"
                  aria-invalid={!!fieldError("phoneNumber")}
                />
              </div>
              {fieldError("phoneNumber") && (
                <p className="text-xs text-destructive">
                  {fieldError("phoneNumber")}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell label="Password" required error={fieldError("password")}>
                <PasswordInput
                  name="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    markDirty("password");
                  }}
                  autoComplete="new-password"
                  aria-invalid={!!fieldError("password")}
                />
              </FieldShell>
              <FieldShell
                label="Confirm password"
                required
                error={fieldError("confirmPassword")}
              >
                <PasswordInput
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    markDirty("confirmPassword");
                  }}
                  autoComplete="new-password"
                  aria-invalid={!!fieldError("confirmPassword")}
                />
              </FieldShell>
            </div>
          </div>

          {/* Step 2 */}
          <div className={cn("space-y-4", step !== 2 && "hidden")}>
            <div className="space-y-2">
              <Label htmlFor="signUpAs">
                Sign up as<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select
                name="signUpAs"
                value={signUpAs}
                onValueChange={(v) => {
                  if (v === "PROVIDER" || v === "SC") {
                    setSignUpAs(v);
                    markDirty("signUpAs");
                  } else {
                    setSignUpAs("");
                  }
                }}
              >
                <BrandedSelectTrigger
                  id="signUpAs"
                  className="w-full"
                  aria-invalid={!!fieldError("signUpAs")}
                >
                  <SelectValue placeholder="Choose your account type">
                    {signUpAs === "PROVIDER" && "Provider"}
                    {signUpAs === "SC" && "Support Coordinator"}
                  </SelectValue>
                </BrandedSelectTrigger>
                <SelectContent>
                  <BrandedSelectItem value="PROVIDER">
                    <div className="flex flex-col">
                      <span className="font-medium">Provider</span>
                      <span className="text-xs text-muted-foreground">
                        Deliver services — rostering, shifts, compliance
                      </span>
                    </div>
                  </BrandedSelectItem>
                  <BrandedSelectItem value="SC">
                    <div className="flex flex-col">
                      <span className="font-medium">Support Coordinator</span>
                      <span className="text-xs text-muted-foreground">
                        Orchestrate care across providers
                      </span>
                    </div>
                  </BrandedSelectItem>
                </SelectContent>
              </Select>
              {fieldError("signUpAs") && (
                <p className="text-xs text-destructive">
                  {fieldError("signUpAs")}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                You can add the other portal later if your organisation does
                both.
              </p>
            </div>

            <Separator />

            <FieldShell
              label="Company legal name"
              required
              error={fieldError("companyLegalName")}
            >
              <Input
                name="companyLegalName"
                value={companyLegalName}
                onChange={(e) => {
                  setCompanyLegalName(e.target.value);
                  markDirty("companyLegalName");
                }}
                autoComplete="organization"
                placeholder="Acme Disability Support Pty Ltd"
                aria-invalid={!!fieldError("companyLegalName")}
              />
            </FieldShell>

            <FieldShell
              label="Trading name (optional)"
              error={fieldError("companyTradingName")}
            >
              <Input
                name="companyTradingName"
                value={companyTradingName}
                onChange={(e) => {
                  setCompanyTradingName(e.target.value);
                  markDirty("companyTradingName");
                }}
                placeholder="Acme Care"
              />
            </FieldShell>

            <FieldShell label="ABN" error={fieldError("abn")}>
              <Input
                name="abn"
                value={abn}
                onChange={(e) => {
                  setAbn(e.target.value);
                  markDirty("abn");
                }}
                placeholder="11 digits"
                aria-invalid={!!fieldError("abn")}
              />
            </FieldShell>

            <Separator />

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  id="isNdisRegistered"
                  name="isNdisRegistered"
                  checked={isNdisRegistered}
                  onCheckedChange={(checked) => {
                    setIsNdisRegistered(checked === true);
                    markDirty("isNdisRegistered");
                  }}
                  className="mt-0.5"
                />
                <span className="flex-1">
                  <span className="block text-sm font-medium leading-none">
                    Registered NDIS Provider
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Check this if your organisation is registered with the NDIS Commission.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  id="acceptedTerms"
                  name="acceptedTerms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => {
                    setAcceptedTerms(checked === true);
                    markDirty("acceptedTerms");
                  }}
                  className="mt-0.5"
                  aria-invalid={!!fieldError("acceptedTerms")}
                />
                <span className="flex-1">
                  <span className="block text-sm font-medium leading-none">
                    I accept the{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      terms and conditions
                    </a>
                    <span className="ml-0.5 text-destructive">*</span>
                  </span>
                </span>
              </label>
              {fieldError("acceptedTerms") && (
                <p className="pl-7 text-xs text-destructive">
                  {fieldError("acceptedTerms")}
                </p>
              )}
            </div>
          </div>

          {state.error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </div>
          )}
        </CardContent>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between gap-2">
            {step === 2 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
              >
                <ArrowLeft />
                Back
              </Button>
            ) : (
              <span />
            )}
            {step === 1 ? (
              <Button type="button" onClick={onNext}>
                Next
                <ArrowRight />
              </Button>
            ) : (
              <Button type="submit" disabled={pending}>
                {pending ? "Creating account…" : "Create account"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      </form>

      {step === 1 && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Or sign up with
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form action={onGoogle}>
            <Button
              type="submit"
              variant="outline"
              size="lg"
              className="w-full gap-2"
              disabled={!googleEnabled}
              title={
                googleEnabled
                  ? undefined
                  : "Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in .env to enable"
              }
            >
              <GoogleIcon />
              Continue with Google
            </Button>
          </form>
        </>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.614z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <span
        className={cn(
          "h-1.5 flex-1 rounded-full",
          step >= 1 ? "bg-primary" : "bg-muted"
        )}
      />
      <span
        className={cn(
          "h-1.5 flex-1 rounded-full",
          step >= 2 ? "bg-primary" : "bg-muted"
        )}
      />
    </div>
  );
}

function FieldShell({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}