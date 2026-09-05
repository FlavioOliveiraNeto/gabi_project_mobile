import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
        />
        <meta name="theme-color" content="#FFFFFF" />

        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.png" />

        {/* iOS: sem estas três o app abre dentro do Safari, com barra de endereço. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Gabi" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: BODY_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const BODY_CSS = `body { background-color: #F6F4FB; overscroll-behavior-y: none; }`;
