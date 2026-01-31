'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useEnrichment } from '@/hooks/useEnrichment';

interface WebsiteSummaryProps {
  clienteId: string;
  sitioWeb: string | null;
}

/**
 * Displays website analysis summary on the client detail page.
 * Only rendered if client has a website URL.
 */
export function WebsiteSummary({ clienteId, sitioWeb }: WebsiteSummaryProps) {
  const { websiteAnalysis, isLoading } = useEnrichment(clienteId);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!sitioWeb) return null;

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg border border-gray-200 p-4">
        <div className="h-4 w-40 rounded bg-gray-200" />
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="h-20 rounded bg-gray-100" />
          <div className="h-20 rounded bg-gray-100" />
          <div className="h-20 rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!websiteAnalysis) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-500">No hay análisis web disponible</p>
        <p className="mt-1 text-xs text-gray-400">{sitioWeb}</p>
      </div>
    );
  }

  const wa = websiteAnalysis;

  // techStack may arrive as a JSON string from the DB — parse safely
  const techStack: Array<{ name: string; category?: string; version?: string }> =
    (() => {
      if (!wa.techStack) return [];
      if (Array.isArray(wa.techStack)) return wa.techStack;
      try {
        const parsed = JSON.parse(wa.techStack as unknown as string);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();

  const toggleSection = (section: string) => {
    setExpanded((prev) => (prev === section ? null : section));
  };

  const scoreColor = (score: number | null) => {
    if (score == null) return 'text-gray-400';
    if (score >= 90) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Análisis Web</h3>
        <a
          href={wa.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline"
        >
          {wa.url}
        </a>
      </div>

      {/* Quick metrics */}
      <div className="grid grid-cols-3 gap-px border-b border-gray-200 bg-gray-100">
        {/* Performance */}
        <div className="flex flex-col items-center bg-white p-3">
          <span className={`text-2xl font-bold ${scoreColor(wa.performanceScore)}`}>
            {wa.performanceScore ?? '—'}
          </span>
          <span className="text-xs text-gray-500">Performance</span>
        </div>
        {/* SSL */}
        <div className="flex flex-col items-center bg-white p-3">
          <span
            className={`text-2xl font-bold ${wa.sslValid ? 'text-green-600' : 'text-red-600'}`}
          >
            {wa.sslValid ? '✓' : '✗'}
          </span>
          <span className="text-xs text-gray-500">SSL</span>
        </div>
        {/* Accessibility */}
        <div className="flex flex-col items-center bg-white p-3">
          <span className={`text-2xl font-bold ${scoreColor(wa.accessibilityScore)}`}>
            {wa.accessibilityScore ?? '—'}
          </span>
          <span className="text-xs text-gray-500">Accesibilidad</span>
        </div>
      </div>

      {/* Screenshots */}
      {(wa.screenshotDesktop || wa.screenshotMobile) && (
        <div className="border-b border-gray-200 p-4">
          <div className="flex gap-3">
            {wa.screenshotDesktop && (
              <div className="flex-1">
                <p className="mb-1 text-xs text-gray-500">Desktop</p>
                <Image
                  src={wa.screenshotDesktop}
                  alt="Desktop screenshot"
                  width={800}
                  height={600}
                  unoptimized
                  className="w-full rounded border border-gray-200"
                />
              </div>
            )}
            {wa.screenshotMobile && (
              <div className="w-24">
                <p className="mb-1 text-xs text-gray-500">Mobile</p>
                <Image
                  src={wa.screenshotMobile}
                  alt="Mobile screenshot"
                  width={320}
                  height={568}
                  unoptimized
                  className="w-full rounded border border-gray-200"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapsible sections */}
      <div className="divide-y divide-gray-100">
        {/* SEO */}
        {(wa.seoTitle || wa.seoDescription) && (
          <CollapsibleSection
            title="SEO"
            isExpanded={expanded === 'seo'}
            onToggle={() => toggleSection('seo')}
          >
            <div className="flex flex-col gap-1 text-xs text-gray-700">
              {wa.seoTitle && (
                <p>
                  <span className="font-medium">Título:</span> {wa.seoTitle}
                </p>
              )}
              {wa.seoDescription && (
                <p>
                  <span className="font-medium">Descripción:</span> {wa.seoDescription}
                </p>
              )}
              {wa.seoH1Count != null && (
                <p>
                  <span className="font-medium">H1s:</span> {wa.seoH1Count}
                </p>
              )}
              <p>
                <span className="font-medium">Indexable:</span>{' '}
                {wa.seoIndexable ? 'Sí' : 'No'}
              </p>
            </div>
          </CollapsibleSection>
        )}

        {/* Tech Stack */}
        {techStack.length > 0 && (
          <CollapsibleSection
            title={`Tech Stack (${techStack.length})`}
            isExpanded={expanded === 'tech'}
            onToggle={() => toggleSection('tech')}
          >
            <div className="flex flex-wrap gap-1">
              {techStack.map((t) => (
                <span
                  key={t.name}
                  className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700"
                  title={`${t.category}${t.version ? ` v${t.version}` : ''}`}
                >
                  {t.name}
                </span>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Security */}
        <CollapsibleSection
          title="Seguridad"
          isExpanded={expanded === 'security'}
          onToggle={() => toggleSection('security')}
        >
          <div className="flex flex-col gap-1 text-xs text-gray-700">
            <p>
              HTTPS: {wa.hasHttps ? '✓' : '✗'} | HSTS:{' '}
              {wa.hstsEnabled ? '✓' : '✗'} | CSP: {wa.hasCsp ? '✓' : '✗'}
            </p>
            <p>Safe Browsing: {wa.isSafeBrowsing ? '✓ Seguro' : '✗ Alerta'}</p>
          </div>
        </CollapsibleSection>
      </div>

      {/* Analysis date */}
      {wa.analyzedAt && (
        <div className="border-t border-gray-200 px-4 py-2 text-xs text-gray-400">
          Analizado:{' '}
          {new Date(wa.analyzedAt).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        {title}
        <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
      </button>
      {isExpanded && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}
