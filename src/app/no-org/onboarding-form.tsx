"use client";

import { useActionState, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BrandedSelectItem,
  BrandedSelectTrigger,
} from "@/components/branded-select";
import {
  Select,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FormError } from "@/components/form-error";

import {
  createOrganisationAction,
  type OnboardingState,
} from "./actions";

const initial: OnboardingState = {};

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    createOrganisationAction,
    initial
  );

  const [signUpAs, setSignUpAs] = useState<"PROVIDER" | "SC" | "">("");
  const [alsoOperatesOther, setAlsoOperatesOther] = useState<"yes" | "no" | "">(
    ""
  );
  const [hybridOrgType, setHybridOrgType] = useState<"SAME" | "SEPARATE" | "">(
    ""
  );
  const otherPortalLabel =
    signUpAs === "PROVIDER" ? "Support Coordination" : "Provider services";

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signUpAs">
          You are signing up as<span className="ml-0.5 text-destructive">*</span>
        </Label>
        <Select
          name="signUpAs"
          value={signUpAs}
          onValueChange={(v) => {
            if (v === "PROVIDER" || v === "SC") setSignUpAs(v);
            else setSignUpAs("");
          }}
        >
          <BrandedSelectTrigger
            id="signUpAs"
            className="w-full"
            aria-invalid={!!state.fieldErrors?.signUpAs}
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
        {state.fieldErrors?.signUpAs && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.signUpAs}
          </p>
        )}
      </div>

      {signUpAs && (
        <div className="space-y-4 rounded-md border border-dashed bg-muted/30 p-3">
          <div className="space-y-2">
            <Label>
              Do you also operate {otherPortalLabel}?
              <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <input
              type="hidden"
              name="alsoOperatesOther"
              value={alsoOperatesOther}
            />
            <ToggleGroup
              value={alsoOperatesOther ? [alsoOperatesOther] : []}
              onValueChange={(vals) => {
                const v = vals[0];
                if (v !== "yes" && v !== "no") return;
                setAlsoOperatesOther(v);
                if (v === "no") setHybridOrgType("");
              }}
              variant="outline"
              className="w-full"
            >
              <ToggleGroupItem value="no" className="flex-1">
                No, just this one
              </ToggleGroupItem>
              <ToggleGroupItem value="yes" className="flex-1">
                Yes, both
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {alsoOperatesOther === "yes" && (
            <div className="space-y-2">
              <Label>
                Under the same organisation?
                <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <input
                type="hidden"
                name="hybridOrgType"
                value={hybridOrgType}
              />
              <ToggleGroup
                value={hybridOrgType ? [hybridOrgType] : []}
                onValueChange={(vals) => {
                  const v = vals[0];
                  if (v !== "SAME" && v !== "SEPARATE") return;
                  setHybridOrgType(v);
                }}
                variant="outline"
                className="w-full"
              >
                <ToggleGroupItem
                  value="SAME"
                  className="flex-1 flex-col items-start gap-0 py-2 h-auto"
                >
                  <span className="font-medium">Same company</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    One organisation, both portals
                  </span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="SEPARATE"
                  className="flex-1 flex-col items-start gap-0 py-2 h-auto"
                >
                  <span className="font-medium">Separate company</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Two organisations, one portal each
                  </span>
                </ToggleGroupItem>
              </ToggleGroup>
              {state.fieldErrors?.hybridOrgType && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.hybridOrgType}
                </p>
              )}
              {hybridOrgType === "SAME" && (
                <p className="text-xs text-muted-foreground">
                  We&apos;ll ask you to sign a Conflict of Interest
                  acknowledgement.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="companyLegalName">
          Company legal name<span className="ml-0.5 text-destructive">*</span>
        </Label>
        <Input
          id="companyLegalName"
          name="companyLegalName"
          placeholder="Acme Disability Support Pty Ltd"
          aria-invalid={!!state.fieldErrors?.companyLegalName}
          required
        />
        {state.fieldErrors?.companyLegalName && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.companyLegalName}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyTradingName">Trading name (optional)</Label>
        <Input id="companyTradingName" name="companyTradingName" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="abn">ABN</Label>
        <Input id="abn" name="abn" placeholder="11 digits" />
        {state.fieldErrors?.abn && (
          <p className="text-xs text-destructive">{state.fieldErrors.abn}</p>
        )}
      </div>

      {alsoOperatesOther === "yes" && hybridOrgType === "SEPARATE" && (
        <div className="space-y-4 rounded-md border border-dashed bg-muted/30 p-3">
          <p className="text-sm font-medium">Second company</p>
          <div className="space-y-2">
            <Label htmlFor="otherCompanyLegalName">
              Legal name<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="otherCompanyLegalName"
              name="otherCompanyLegalName"
              placeholder="Acme Coordination Pty Ltd"
              aria-invalid={!!state.fieldErrors?.otherCompanyLegalName}
            />
            {state.fieldErrors?.otherCompanyLegalName && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.otherCompanyLegalName}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="otherCompanyTradingName">
              Trading name (optional)
            </Label>
            <Input
              id="otherCompanyTradingName"
              name="otherCompanyTradingName"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="otherAbn">ABN</Label>
            <Input id="otherAbn" name="otherAbn" placeholder="11 digits" />
            {state.fieldErrors?.otherAbn && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.otherAbn}
              </p>
            )}
          </div>
        </div>
      )}

      <Separator />

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox name="acceptedTerms" className="mt-0.5" required />
        <span className="text-sm">
          I accept the terms and conditions
        </span>
      </label>

      <FormError message={state.error} />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create organisation"}
        <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
    </form>
  );
}