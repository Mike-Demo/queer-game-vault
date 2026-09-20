import { useId, useRef, type MouseEvent } from "react";

import {
  NesButton,
  NesDialog,
  NesText,
} from "@/design-system/nes-229931";
import { useTheme } from "@/components/ThemeProvider";

const CHARITY_GUIDE_URL =
  "https://support.humblebundle.com/hc/en-us/articles/210213728-Choose-Your-Own-Charity-Bundle-Promotions";
const GGP_FUNDRAISER_URL = "https://www.paypal.com/fundraiser/charity/3885498";

interface PurchaseLinkProps {
  children: string;
  destinationLabel: string;
  gameTitle: string;
  href: string;
}

/**
 * Preserves a crawlable, no-JavaScript store link while offering visitors a
 * chance to check Humble Bundle and support a queer gaming charity first.
 */
export function PurchaseLink({ children, destinationLabel, gameTitle, href }: PurchaseLinkProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { resolved } = useTheme();
  const humbleSearchUrl = `https://www.humblebundle.com/store/search?search=${encodeURIComponent(gameTitle)}`;

  const openReminder = (event: MouseEvent<HTMLAnchorElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    event.preventDefault();
    dialog.showModal();
  };

  const openExternal = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <a href={href} onClick={openReminder} rel="noreferrer noopener" target="_blank">
        {children}
      </a>
      <NesDialog
        aria-labelledby={titleId}
        className="purchase-dialog"
        dark={resolved === "dark"}
        ref={dialogRef}
        rounded
      >
        <div className="stack">
          <h2 className="title-md" id={titleId}>
            Check Humble first?
          </h2>
          <p>
            Eligible Humble Bundle promotions may let you direct part of your purchase to a charity.
            Consider Gay Gaming Professionals (GGP).
          </p>
          <div className="purchase-dialog-actions">
            <NesButton onClick={() => openExternal(humbleSearchUrl)} variant="primary">
              Check Humble Bundle
            </NesButton>
            <NesButton onClick={() => openExternal(href)}>
              {`Continue to ${destinationLabel}`}
            </NesButton>
            <a href={CHARITY_GUIDE_URL} rel="noreferrer noopener" target="_blank">
              How to choose your charity
            </a>
            <a href={GGP_FUNDRAISER_URL} rel="noreferrer noopener" target="_blank">
              Support GGP
            </a>
          </div>
          <form method="dialog">
            <NesButton>Cancel</NesButton>
          </form>
          <NesText className="text-xs">
            Availability and charity eligibility vary by promotion.
          </NesText>
        </div>
      </NesDialog>
    </>
  );
}