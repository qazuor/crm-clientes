'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useWebsiteAnalysis } from '@/hooks/useWebsiteAnalysis';
import { Button } from '@/components/ui/Button';
import {
  GlobeAltIcon,
  PhotoIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  MagnifyingGlassIcon,
  CpuChipIcon,
  LockClosedIcon,
  EyeIcon,
  DocumentMagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';

interface WebsiteAnalysisPanelProps {
  clienteId: string;
  websiteUrl?: string;
}

export function WebsiteAnalysisPanel({ clienteId, websiteUrl }: WebsiteAnalysisPanelProps) {
  const {
    analysis,
    isLoading,
    isAnalyzing,
    analyze,
    quickAnalyze,
    analyzeError,
    analyzeResult,
  } = useWebsiteAnalysis(clienteId);

  const [activeTab, setActiveTab] = useState<
    'screenshots' | 'performance' | 'ssl' | 'seo' | 'techstack' | 'security' | 'accessibility' | 'crawlability' | 'responsive' | 'server'
  >('screenshots');
  const [showExternalOptions, setShowExternalOptions] = useState(false);
  const [externalOptions, setExternalOptions] = useState({
    includeBuiltWith: false,
    includeWhois: false,
  });

  const handleFullAnalysis = async () => {
    try {
      await analyze({
        includeBuiltWith: externalOptions.includeBuiltWith,
        includeWhois: externalOptions.includeWhois,
        // Free APIs enabled by default
        includeServerLocation: true,
        includeFavicon: true,
      });
    } catch {
      // Error handled by hook
    }
  };

  const handleQuickAnalysis = async () => {
    try {
      await quickAnalyze();
    } catch {
      // Error handled by hook
    }
  };

  if (!websiteUrl) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            No hay sitio web registrado para este cliente
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <GlobeAltIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Analisis de Sitio Web
              </h3>
              <a
                href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                {websiteUrl}
              </a>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleQuickAnalysis}
              disabled={isAnalyzing}
              variant="secondary"
              size="sm"
            >
              {isAnalyzing ? 'Analizando...' : 'Rapido'}
            </Button>
            <Button onClick={handleFullAnalysis} disabled={isAnalyzing} size="sm">
              {isAnalyzing ? 'Analizando...' : 'Completo'}
            </Button>
          </div>
        </div>

        {/* External API Options */}
        <div className="mt-4 border border-gray-200 rounded-lg">
          <button
            onClick={() => setShowExternalOptions(!showExternalOptions)}
            className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
          >
            <span>APIs Externas (opcionales)</span>
            {showExternalOptions ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </button>
          {showExternalOptions && (
            <div className="px-4 py-3 border-t border-gray-200 space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={externalOptions.includeBuiltWith}
                  onChange={(e) => setExternalOptions(prev => ({ ...prev, includeBuiltWith: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Detectar tecnologias con BuiltWith
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={externalOptions.includeWhois}
                  onChange={(e) => setExternalOptions(prev => ({ ...prev, includeWhois: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Info de dominio con WhoisXML (500/mes gratis)
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Las APIs externas consumen cuota. Server Location, Favicon y Security Headers son gratuitos y siempre se incluyen.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error display */}
      {analyzeError && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-sm text-red-600">{analyzeError.message}</p>
          </div>
        </div>
      )}

      {/* Result errors */}
      {analyzeResult?.errors && analyzeResult.errors.length > 0 && (
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <p className="text-sm font-medium text-yellow-800 mb-1">
            Algunas partes del analisis fallaron:
          </p>
          <ul className="text-sm text-yellow-600">
            {analyzeResult.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex -mb-px min-w-max">
          <TabButton
            active={activeTab === 'screenshots'}
            onClick={() => setActiveTab('screenshots')}
            icon={<PhotoIcon className="h-4 w-4" />}
            label="Screenshots"
          />
          <TabButton
            active={activeTab === 'performance'}
            onClick={() => setActiveTab('performance')}
            icon={<ChartBarIcon className="h-4 w-4" />}
            label="Performance"
          />
          <TabButton
            active={activeTab === 'ssl'}
            onClick={() => setActiveTab('ssl')}
            icon={<ShieldCheckIcon className="h-4 w-4" />}
            label="SSL"
          />
          <TabButton
            active={activeTab === 'seo'}
            onClick={() => setActiveTab('seo')}
            icon={<MagnifyingGlassIcon className="h-4 w-4" />}
            label="SEO"
          />
          <TabButton
            active={activeTab === 'techstack'}
            onClick={() => setActiveTab('techstack')}
            icon={<CpuChipIcon className="h-4 w-4" />}
            label="Tech"
          />
          <TabButton
            active={activeTab === 'security'}
            onClick={() => setActiveTab('security')}
            icon={<LockClosedIcon className="h-4 w-4" />}
            label="Security"
          />
          <TabButton
            active={activeTab === 'accessibility'}
            onClick={() => setActiveTab('accessibility')}
            icon={<EyeIcon className="h-4 w-4" />}
            label="A11y"
          />
          <TabButton
            active={activeTab === 'crawlability'}
            onClick={() => setActiveTab('crawlability')}
            icon={<DocumentMagnifyingGlassIcon className="h-4 w-4" />}
            label="Crawl"
          />
          <TabButton
            active={activeTab === 'responsive'}
            onClick={() => setActiveTab('responsive')}
            icon={<DevicePhoneMobileIcon className="h-4 w-4" />}
            label="Responsive"
          />
          <TabButton
            active={activeTab === 'server'}
            onClick={() => setActiveTab('server')}
            icon={<ServerIcon className="h-4 w-4" />}
            label="Server"
          />
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'screenshots' && (
          <ScreenshotsTab
            desktop={analysis?.screenshotDesktop}
            mobile={analysis?.screenshotMobile}
          />
        )}
        {activeTab === 'performance' && (
          <PerformanceTab
            performanceScore={analysis?.performanceScore}
            mobileScore={analysis?.mobileScore}
            desktopScore={analysis?.desktopScore}
            fcpMs={analysis?.fcpMs}
            lcpMs={analysis?.lcpMs}
            ttiMs={analysis?.ttiMs}
            cls={analysis?.cls}
          />
        )}
        {activeTab === 'ssl' && (
          <SslTab
            sslValid={analysis?.sslValid}
            sslProtocol={analysis?.sslProtocol}
            sslIssuer={analysis?.sslIssuer}
            sslExpiresAt={analysis?.sslExpiresAt}
          />
        )}
        {activeTab === 'seo' && (
          <SeoTab
            title={analysis?.seoTitle}
            description={analysis?.seoDescription}
            h1Count={analysis?.seoH1Count}
            hasCanonical={analysis?.seoHasCanonical}
            indexable={analysis?.seoIndexable}
            hasOpenGraph={analysis?.hasOpenGraph}
            hasTwitterCards={analysis?.hasTwitterCards}
            hasJsonLd={analysis?.hasJsonLd}
            jsonLdTypes={analysis?.jsonLdTypes}
          />
        )}
        {activeTab === 'techstack' && (
          <TechStackTab techStack={analysis?.techStack} />
        )}
        {activeTab === 'security' && (
          <SecurityTab
            hasHttps={analysis?.hasHttps}
            hstsEnabled={analysis?.hstsEnabled}
            xFrameOptions={analysis?.xFrameOptions}
            hasCsp={analysis?.hasCsp}
          />
        )}
        {activeTab === 'accessibility' && (
          <AccessibilityTab
            score={analysis?.accessibilityScore}
            issues={analysis?.accessibilityIssues}
          />
        )}
        {activeTab === 'crawlability' && (
          <CrawlabilityTab
            hasRobotsTxt={analysis?.hasRobotsTxt}
            robotsAllowsIndex={analysis?.robotsAllowsIndex}
            hasSitemap={analysis?.hasSitemap}
            sitemapUrl={analysis?.sitemapUrl}
            sitemapUrlCount={analysis?.sitemapUrlCount}
          />
        )}
        {activeTab === 'responsive' && (
          <ResponsiveTab
            isResponsive={analysis?.isResponsive}
            confidence={analysis?.responsiveConfidence}
            hasViewportMeta={analysis?.hasViewportMeta}
            mediaQueriesCount={analysis?.mediaQueriesCount}
            breakpoints={analysis?.breakpoints}
          />
        )}
        {activeTab === 'server' && (
          <ServerInfoTab
            serverLocation={analysis?.serverLocation}
            serverIp={analysis?.serverIp}
            serverIsp={analysis?.serverIsp}
            serverCountry={analysis?.serverCountry}
            serverCity={analysis?.serverCity}
            isHosting={analysis?.isHosting}
            faviconUrl={analysis?.faviconUrl}
            domainRegistrar={analysis?.domainRegistrar}
            domainCreatedAt={analysis?.domainCreatedAt}
            domainExpiresAt={analysis?.domainExpiresAt}
            domainAgeYears={analysis?.domainAgeYears}
            daysUntilExpiry={analysis?.daysUntilExpiry}
            whoisOwner={analysis?.whoisOwner}
            whoisCountry={analysis?.whoisCountry}
          />
        )}
      </div>

      {/* Metadata */}
      {analysis?.analyzedAt && (
        <div className="px-6 pb-4 border-t border-gray-200 pt-4">
          <p className="text-xs text-gray-500">
            Analisis: {analysis.apisUsed?.join(', ') || 'N/A'}
          </p>
          <p className="text-xs text-gray-500">
            Ultima actualizacion: {new Date(analysis.analyzedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

interface ScreenshotsTabProps {
  desktop?: string | null;
  mobile?: string | null;
}

function ScreenshotsTab({ desktop, mobile }: ScreenshotsTabProps) {
  const [selectedView, setSelectedView] = useState<'desktop' | 'mobile'>('desktop');

  if (!desktop && !mobile) {
    return (
      <div className="text-center py-8">
        <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">
          No hay screenshots disponibles
        </p>
        <p className="text-xs text-gray-400">
          Haz clic en &quot;Rapido&quot; o &quot;Completo&quot; para capturar screenshots
        </p>
      </div>
    );
  }

  const currentScreenshot = selectedView === 'desktop' ? desktop : mobile;

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex justify-center space-x-2">
        <button
          onClick={() => setSelectedView('desktop')}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
            selectedView === 'desktop'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <ComputerDesktopIcon className="h-5 w-5" />
          <span>Desktop</span>
        </button>
        <button
          onClick={() => setSelectedView('mobile')}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
            selectedView === 'mobile'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <DevicePhoneMobileIcon className="h-5 w-5" />
          <span>Mobile</span>
        </button>
      </div>

      {/* Screenshot Display */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
        {currentScreenshot ? (
          <div className={`relative ${selectedView === 'mobile' ? 'max-w-xs mx-auto' : ''}`}>
            <Image
              src={currentScreenshot}
              alt={`${selectedView} screenshot`}
              width={selectedView === 'desktop' ? 1920 : 375}
              height={selectedView === 'desktop' ? 1080 : 667}
              className="w-full h-auto"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">
              No hay screenshot {selectedView === 'desktop' ? 'de escritorio' : 'movil'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface PerformanceTabProps {
  performanceScore?: number | null;
  mobileScore?: number | null;
  desktopScore?: number | null;
  fcpMs?: number | null;
  lcpMs?: number | null;
  ttiMs?: number | null;
  cls?: number | null;
}

function PerformanceTab({
  performanceScore,
  mobileScore,
  desktopScore,
  fcpMs,
  lcpMs,
  ttiMs,
  cls,
}: PerformanceTabProps) {
  if (!performanceScore && !mobileScore && !desktopScore) {
    return (
      <div className="text-center py-8">
        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">
          No hay datos de performance disponibles
        </p>
        <p className="text-xs text-gray-400">
          Haz clic en &quot;Completo&quot; para analizar la performance
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score Cards */}
      <div className="grid grid-cols-3 gap-4">
        <ScoreCard label="General" score={performanceScore} />
        <ScoreCard label="Mobile" score={mobileScore} />
        <ScoreCard label="Desktop" score={desktopScore} />
      </div>

      {/* Core Web Vitals */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Core Web Vitals
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            label="First Contentful Paint (FCP)"
            value={fcpMs ? `${(fcpMs / 1000).toFixed(2)}s` : 'N/A'}
            status={fcpMs ? (fcpMs < 1800 ? 'good' : fcpMs < 3000 ? 'needs-improvement' : 'poor') : undefined}
          />
          <MetricCard
            label="Largest Contentful Paint (LCP)"
            value={lcpMs ? `${(lcpMs / 1000).toFixed(2)}s` : 'N/A'}
            status={lcpMs ? (lcpMs < 2500 ? 'good' : lcpMs < 4000 ? 'needs-improvement' : 'poor') : undefined}
          />
          <MetricCard
            label="Time to Interactive (TTI)"
            value={ttiMs ? `${(ttiMs / 1000).toFixed(2)}s` : 'N/A'}
            status={ttiMs ? (ttiMs < 3800 ? 'good' : ttiMs < 7300 ? 'needs-improvement' : 'poor') : undefined}
          />
          <MetricCard
            label="Cumulative Layout Shift (CLS)"
            value={cls !== null && cls !== undefined ? cls.toFixed(3) : 'N/A'}
            status={cls !== null && cls !== undefined ? (cls < 0.1 ? 'good' : cls < 0.25 ? 'needs-improvement' : 'poor') : undefined}
          />
        </div>
      </div>
    </div>
  );
}

interface ScoreCardProps {
  label: string;
  score?: number | null;
}

function ScoreCard({ label, score }: ScoreCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-600';
    if (s >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (s: number) => {
    if (s >= 90) return 'bg-green-100';
    if (s >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="text-center p-4 rounded-lg bg-gray-50">
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      {score !== null && score !== undefined ? (
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${getScoreBg(
            score
          )}`}
        >
          <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
        </div>
      ) : (
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-200">
          <span className="text-lg text-gray-400">-</span>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  status?: 'good' | 'needs-improvement' | 'poor';
}

function MetricCard({ label, value, status }: MetricCardProps) {
  const statusColors = {
    good: 'bg-green-100 text-green-800',
    'needs-improvement': 'bg-yellow-100 text-yellow-800',
    poor: 'bg-red-100 text-red-800',
  };

  return (
    <div className="p-3 rounded-lg bg-gray-50">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-gray-900">{value}</span>
        {status && (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[status]}`}>
            {status === 'good' ? 'Bueno' : status === 'needs-improvement' ? 'Mejorar' : 'Pobre'}
          </span>
        )}
      </div>
    </div>
  );
}

interface SslTabProps {
  sslValid?: boolean | null;
  sslProtocol?: string | null;
  sslIssuer?: string | null;
  sslExpiresAt?: string | null;
}

function SslTab({ sslValid, sslProtocol, sslIssuer, sslExpiresAt }: SslTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${
            sslValid
              ? 'bg-green-100'
              : sslValid === false
              ? 'bg-red-100'
              : 'bg-gray-100'
          }`}
        >
          <ShieldCheckIcon
            className={`h-6 w-6 ${
              sslValid
                ? 'text-green-600'
                : sslValid === false
                ? 'text-red-600'
                : 'text-gray-400'
            }`}
          />
        </div>
        <div>
          <p className="font-medium text-gray-900">
            {sslValid === true
              ? 'Certificado SSL Valido'
              : sslValid === false
              ? 'SSL No Valido o No Presente'
              : 'Estado SSL Desconocido'}
          </p>
          <p className="text-sm text-gray-500">
            {sslProtocol || 'Protocolo no detectado'}
          </p>
        </div>
      </div>

      {(sslIssuer || sslExpiresAt) && (
        <div className="mt-4 space-y-2">
          {sslIssuer && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Emisor:</span>
              <span className="text-gray-900">{sslIssuer}</span>
            </div>
          )}
          {sslExpiresAt && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Expira:</span>
              <span className="text-gray-900">
                {new Date(sslExpiresAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      )}

      {sslValid === null && (
        <p className="text-sm text-gray-500 text-center py-4">
          Ejecuta un analisis para verificar el certificado SSL
        </p>
      )}
    </div>
  );
}

// Tab Button Component
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
        active
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// SEO Tab Component
interface SeoTabProps {
  title?: string | null;
  description?: string | null;
  h1Count?: number | null;
  hasCanonical?: boolean | null;
  indexable?: boolean | null;
  hasOpenGraph?: boolean | null;
  hasTwitterCards?: boolean | null;
  hasJsonLd?: boolean | null;
  jsonLdTypes?: string[] | null;
}

function SeoTab({
  title,
  description,
  h1Count,
  hasCanonical,
  indexable,
  hasOpenGraph,
  hasTwitterCards,
  hasJsonLd,
  jsonLdTypes,
}: SeoTabProps) {
  const hasData = title || description || h1Count !== null;

  if (!hasData) {
    return (
      <div className="text-center py-8">
        <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">
          No hay datos SEO disponibles
        </p>
        <p className="text-xs text-gray-400">
          Ejecuta un analisis completo para obtener datos SEO
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic SEO */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Informacion Basica
        </h4>
        <div className="space-y-3">
          {title && (
            <div>
              <p className="text-xs text-gray-500">Title Tag</p>
              <p className="text-sm text-gray-900">{title}</p>
              <p className="text-xs text-gray-400">
                {title.length} caracteres {title.length > 60 ? '(muy largo)' : ''}
              </p>
            </div>
          )}
          {description && (
            <div>
              <p className="text-xs text-gray-500">Meta Description</p>
              <p className="text-sm text-gray-900">{description}</p>
              <p className="text-xs text-gray-400">
                {description.length} caracteres {description.length > 160 ? '(muy largo)' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SEO Checks */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Verificaciones SEO
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <CheckItem label="H1 Tags" value={h1Count === 1 ? 'OK (1 H1)' : `${h1Count ?? 0} H1s`} ok={h1Count === 1} />
          <CheckItem label="Canonical URL" value={hasCanonical ? 'Presente' : 'Ausente'} ok={hasCanonical ?? false} />
          <CheckItem label="Indexable" value={indexable ? 'Si' : 'Bloqueado'} ok={indexable ?? false} />
          <CheckItem label="Open Graph" value={hasOpenGraph ? 'Presente' : 'Ausente'} ok={hasOpenGraph ?? false} />
          <CheckItem label="Twitter Cards" value={hasTwitterCards ? 'Presente' : 'Ausente'} ok={hasTwitterCards ?? false} />
          <CheckItem label="JSON-LD" value={hasJsonLd ? 'Presente' : 'Ausente'} ok={hasJsonLd ?? false} />
        </div>
      </div>

      {/* JSON-LD Types */}
      {jsonLdTypes && jsonLdTypes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Tipos de Schema.org
          </h4>
          <div className="flex flex-wrap gap-2">
            {jsonLdTypes.map((type, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Tech Stack Tab Component
interface TechStackTabProps {
  techStack?: {
    technologies?: Array<{ name: string; category: string; confidence: number }>;
    categories?: Record<string, string[]>;
  } | null;
}

function TechStackTab({ techStack }: TechStackTabProps) {
  if (!techStack || !techStack.technologies || techStack.technologies.length === 0) {
    return (
      <div className="text-center py-8">
        <CpuChipIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">
          No se detectaron tecnologias
        </p>
        <p className="text-xs text-gray-400">
          Ejecuta un analisis completo para detectar el stack tecnologico
        </p>
      </div>
    );
  }

  const categories = techStack.categories || {};

  return (
    <div className="space-y-4">
      {Object.entries(categories).map(([category, techs]) => (
        <div key={category}>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            {category}
          </h4>
          <div className="flex flex-wrap gap-2">
            {techs.map((tech) => {
              const techData = techStack.technologies?.find((t) => t.name === tech);
              return (
                <span
                  key={tech}
                  className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm flex items-center gap-2"
                >
                  {tech}
                  {techData && (
                    <span className="text-xs opacity-60">
                      {techData.confidence}%
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Security Tab Component
interface SecurityTabProps {
  hasHttps?: boolean | null;
  hstsEnabled?: boolean | null;
  xFrameOptions?: string | null;
  hasCsp?: boolean | null;
}

function SecurityTab({ hasHttps, hstsEnabled, xFrameOptions, hasCsp }: SecurityTabProps) {
  const hasData = hasHttps !== null || hstsEnabled !== null;

  if (!hasData) {
    return (
      <div className="text-center py-8">
        <LockClosedIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">
          No hay datos de seguridad disponibles
        </p>
        <p className="text-xs text-gray-400">
          Ejecuta un analisis completo para verificar la seguridad
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">
        Security Headers
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <CheckItem label="HTTPS" value={hasHttps ? 'Activo' : 'Inactivo'} ok={hasHttps ?? false} />
        <CheckItem label="HSTS" value={hstsEnabled ? 'Activo' : 'Inactivo'} ok={hstsEnabled ?? false} />
        <CheckItem
          label="X-Frame-Options"
          value={xFrameOptions || 'No configurado'}
          ok={!!xFrameOptions}
        />
        <CheckItem label="CSP" value={hasCsp ? 'Presente' : 'Ausente'} ok={hasCsp ?? false} />
      </div>
    </div>
  );
}

// Accessibility Tab Component
interface AccessibilityTabProps {
  score?: number | null;
  issues?: Array<{ severity: string; rule: string; message: string; count?: number }> | null;
}

function AccessibilityTab({ score, issues }: AccessibilityTabProps) {
  if (score === null || score === undefined) {
    return (
      <div className="text-center py-8">
        <EyeIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">
          No hay datos de accesibilidad disponibles
        </p>
        <p className="text-xs text-gray-400">
          Ejecuta un analisis completo para verificar la accesibilidad
        </p>
      </div>
    );
  }

  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-600 bg-green-100';
    if (s >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'serious':
        return 'bg-orange-100 text-orange-800';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Score */}
      <div className="flex items-center justify-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${getScoreColor(score)}`}>
          <span className="text-2xl font-bold">{score}</span>
        </div>
      </div>

      {/* Issues */}
      {issues && issues.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Problemas encontrados ({issues.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {issues.map((issue, i) => (
              <div
                key={i}
                className="p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                    {issue.severity}
                  </span>
                  {issue.count && issue.count > 1 && (
                    <span className="text-xs text-gray-500">x{issue.count}</span>
                  )}
                </div>
                <p className="text-sm text-gray-900 mt-1">{issue.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {issues && issues.length === 0 && (
        <p className="text-center text-sm text-green-600">
          No se encontraron problemas de accesibilidad
        </p>
      )}
    </div>
  );
}

// Crawlability Tab Component
interface CrawlabilityTabProps {
  hasRobotsTxt?: boolean | null;
  robotsAllowsIndex?: boolean | null;
  hasSitemap?: boolean | null;
  sitemapUrl?: string | null;
  sitemapUrlCount?: number | null;
}

function CrawlabilityTab({
  hasRobotsTxt,
  robotsAllowsIndex,
  hasSitemap,
  sitemapUrl,
  sitemapUrlCount,
}: CrawlabilityTabProps) {
  const hasData = hasRobotsTxt !== null || hasSitemap !== null;

  if (!hasData) {
    return (
      <div className="text-center py-8">
        <DocumentMagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">
          No hay datos de crawleabilidad disponibles
        </p>
        <p className="text-xs text-gray-400">
          Ejecuta un analisis completo para verificar robots.txt y sitemap
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">
        Crawleabilidad
      </h4>

      <div className="grid grid-cols-2 gap-3">
        <CheckItem label="robots.txt" value={hasRobotsTxt ? 'Presente' : 'Ausente'} ok={hasRobotsTxt ?? false} />
        <CheckItem
          label="Permite indexacion"
          value={robotsAllowsIndex ? 'Si' : 'No'}
          ok={robotsAllowsIndex ?? false}
        />
        <CheckItem label="Sitemap" value={hasSitemap ? 'Presente' : 'Ausente'} ok={hasSitemap ?? false} />
        {sitemapUrlCount !== null && sitemapUrlCount !== undefined && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">URLs en Sitemap</p>
            <p className="text-lg font-semibold text-gray-900">
              {sitemapUrlCount.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {sitemapUrl && (
        <div className="mt-3">
          <p className="text-xs text-gray-500">Sitemap URL</p>
          <a
            href={sitemapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline break-all"
          >
            {sitemapUrl}
          </a>
        </div>
      )}
    </div>
  );
}

// Check Item Component
interface CheckItemProps {
  label: string;
  value: string;
  ok: boolean;
}

function CheckItem({ label, value, ok }: CheckItemProps) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-gray-900">{value}</span>
        {ok ? (
          <CheckCircleIcon className="h-4 w-4 text-green-500" />
        ) : (
          <XCircleIcon className="h-4 w-4 text-red-500" />
        )}
      </div>
    </div>
  );
}

// Responsive Tab Component
interface ResponsiveTabProps {
  isResponsive?: boolean | null;
  confidence?: 'high' | 'medium' | 'low' | null;
  hasViewportMeta?: boolean | null;
  mediaQueriesCount?: number | null;
  breakpoints?: string[] | null;
}

function ResponsiveTab({
  isResponsive,
  confidence,
  hasViewportMeta,
  mediaQueriesCount,
  breakpoints,
}: ResponsiveTabProps) {
  const hasData = isResponsive !== null && isResponsive !== undefined;

  if (!hasData) {
    return (
      <div className="text-center py-8">
        <DevicePhoneMobileIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">
          No hay datos de responsive disponibles
        </p>
        <p className="text-xs text-gray-400">
          Ejecuta un analisis completo para verificar si el sitio es responsive
        </p>
      </div>
    );
  }

  const getConfidenceColor = (conf?: string | null) => {
    switch (conf) {
      case 'high':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceLabel = (conf?: string | null) => {
    switch (conf) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Media';
      case 'low':
        return 'Baja';
      default:
        return 'Desconocida';
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Status */}
      <div className="flex items-center justify-center">
        <div
          className={`flex items-center gap-4 p-6 rounded-lg ${
            isResponsive
              ? 'bg-green-50'
              : 'bg-red-50'
          }`}
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isResponsive
                ? 'bg-green-100'
                : 'bg-red-100'
            }`}
          >
            {isResponsive ? (
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            ) : (
              <XCircleIcon className="h-8 w-8 text-red-600" />
            )}
          </div>
          <div>
            <p
              className={`text-lg font-semibold ${
                isResponsive
                  ? 'text-green-800'
                  : 'text-red-800'
              }`}
            >
              {isResponsive ? 'Sitio Responsive' : 'No Responsive'}
            </p>
            <p className="text-sm text-gray-600">
              Confianza:{' '}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getConfidenceColor(confidence)}`}>
                {getConfidenceLabel(confidence)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Detalles del Analisis
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <CheckItem
            label="Viewport Meta Tag"
            value={hasViewportMeta ? 'Presente' : 'Ausente'}
            ok={hasViewportMeta ?? false}
          />
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Media Queries</p>
            <p className="text-lg font-semibold text-gray-900">
              {mediaQueriesCount ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Breakpoints */}
      {breakpoints && breakpoints.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Breakpoints Detectados
          </h4>
          <div className="flex flex-wrap gap-2">
            {breakpoints.map((bp, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm"
              >
                {bp}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Server Info Tab Component
interface ServerInfoTabProps {
  serverLocation?: string | null;
  serverIp?: string | null;
  serverIsp?: string | null;
  serverCountry?: string | null;
  serverCity?: string | null;
  isHosting?: boolean | null;
  faviconUrl?: string | null;
  domainRegistrar?: string | null;
  domainCreatedAt?: string | Date | null;
  domainExpiresAt?: string | Date | null;
  domainAgeYears?: number | null;
  daysUntilExpiry?: number | null;
  whoisOwner?: string | null;
  whoisCountry?: string | null;
}

function ServerInfoTab({
  serverLocation,
  serverIp,
  serverIsp,
  serverCountry,
  serverCity,
  isHosting,
  faviconUrl,
  domainRegistrar,
  domainCreatedAt,
  domainExpiresAt,
  domainAgeYears,
  daysUntilExpiry,
  whoisOwner,
  whoisCountry,
}: ServerInfoTabProps) {
  const hasServerData = serverIp || serverLocation || serverIsp;
  const hasWhoisData = domainRegistrar || domainCreatedAt || whoisOwner;
  const hasAnyData = hasServerData || hasWhoisData || faviconUrl;

  if (!hasAnyData) {
    return (
      <div className="text-center py-8">
        <ServerIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">
          No hay datos del servidor disponibles
        </p>
        <p className="text-xs text-gray-400">
          Ejecuta un analisis completo para obtener informacion del servidor
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Favicon */}
      {faviconUrl && (
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <img
            src={faviconUrl}
            alt="Favicon"
            className="w-8 h-8"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div>
            <p className="text-xs text-gray-500">Favicon</p>
            <a
              href={faviconUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline truncate block max-w-xs"
            >
              {faviconUrl}
            </a>
          </div>
        </div>
      )}

      {/* Server Location */}
      {hasServerData && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Ubicacion del Servidor
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {serverIp && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">IP del Servidor</p>
                <p className="text-sm font-mono text-gray-900">{serverIp}</p>
              </div>
            )}
            {serverLocation && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Ubicacion</p>
                <p className="text-sm text-gray-900">{serverLocation}</p>
              </div>
            )}
            {serverCountry && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Pais</p>
                <p className="text-sm text-gray-900">{serverCountry}</p>
              </div>
            )}
            {serverCity && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Ciudad</p>
                <p className="text-sm text-gray-900">{serverCity}</p>
              </div>
            )}
            {serverIsp && (
              <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                <p className="text-xs text-gray-500">ISP / Hosting</p>
                <p className="text-sm text-gray-900">
                  {serverIsp}
                  {isHosting && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                      Hosting
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Domain WHOIS */}
      {hasWhoisData && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Informacion del Dominio (WHOIS)
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {domainRegistrar && (
              <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                <p className="text-xs text-gray-500">Registrador</p>
                <p className="text-sm text-gray-900">{domainRegistrar}</p>
              </div>
            )}
            {whoisOwner && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Propietario</p>
                <p className="text-sm text-gray-900">{whoisOwner}</p>
              </div>
            )}
            {whoisCountry && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Pais del Propietario</p>
                <p className="text-sm text-gray-900">{whoisCountry}</p>
              </div>
            )}
            {domainAgeYears !== null && domainAgeYears !== undefined && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Edad del Dominio</p>
                <p className="text-sm text-gray-900">
                  {domainAgeYears} año{domainAgeYears !== 1 ? 's' : ''}
                </p>
              </div>
            )}
            {domainCreatedAt && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Creado</p>
                <p className="text-sm text-gray-900">
                  {new Date(domainCreatedAt).toLocaleDateString()}
                </p>
              </div>
            )}
            {domainExpiresAt && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Expira</p>
                <p className="text-sm text-gray-900">
                  {new Date(domainExpiresAt).toLocaleDateString()}
                  {daysUntilExpiry !== null && daysUntilExpiry !== undefined && daysUntilExpiry < 60 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                      {daysUntilExpiry < 0 ? 'Expirado!' : `${daysUntilExpiry} dias`}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WebsiteAnalysisPanel;
