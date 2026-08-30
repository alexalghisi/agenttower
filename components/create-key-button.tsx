"use client";

import { useState } from "react";
import { createApiKeyAction } from "@/features/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeBlock } from "@/components/product/code-block";

export function CreateKeyButton({ organizationId }: { organizationId: string }) {
  const [name, setName] = useState("Ingest key");
  const [plaintext, setPlaintext] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const key = await createApiKeyAction(organizationId, name);
          setPlaintext(key.plaintext);
        }}
      >
        <Input value={name} onChange={(event) => setName(event.target.value)} />
        <Button type="submit">Create key</Button>
      </form>
      {plaintext ? <CodeBlock label="Shown once" code={plaintext} /> : null}
    </div>
  );
}
