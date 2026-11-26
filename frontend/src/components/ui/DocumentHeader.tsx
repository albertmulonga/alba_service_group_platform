/**
 * En-tête professionnel ALBA SERVICE GROUP
 * Utilisé sur tous les documents imprimés (factures, devis, reçus, bons de livraison)
 */
export interface DocumentHeaderProps {
  docType: string        // ex: "FACTURE", "DEVIS", "REÇU"
  docNumber: string
  date: string
  dueDate?: string
  clientName?: string
  clientAddress?: string
  clientPhone?: string
  clientEmail?: string
  extraRight?: React.ReactNode
}

import React from 'react'

export default function DocumentHeader({
  docType, docNumber, date, dueDate,
  clientName, clientAddress, clientPhone, clientEmail,
  extraRight,
}: DocumentHeaderProps) {
  return (
    <div className="doc-header">
      {/* Top band */}
      <div className="doc-header-top">
        <div className="doc-header-logo-block">
          <img src="/alba-logo.png" alt="ALBA SERVICE GROUP" className="doc-logo" />
          <div className="doc-company-info">
            <h1 className="doc-company-name">ALBA SERVICE GROUP</h1>
            <p className="doc-company-tagline">L'excellence au service de vos projets</p>
            <div className="doc-company-details">
              <span>📍 Kindu – Province du Maniema – R.D. Congo</span>
              <span>📞 +243 XXX XXX XXX</span>
              <span>✉ contact@alba-service.com</span>
              <span>🌐 www.alba-service.com</span>
            </div>
          </div>
        </div>
        <div className="doc-type-block">
          <div className="doc-type-label">{docType}</div>
          <div className="doc-type-number">{docNumber}</div>
          <div className="doc-type-meta">
            <div className="doc-meta-row">
              <span className="doc-meta-key">Date :</span>
              <span className="doc-meta-val">{date}</span>
            </div>
            {dueDate && (
              <div className="doc-meta-row">
                <span className="doc-meta-key">Échéance :</span>
                <span className="doc-meta-val">{dueDate}</span>
              </div>
            )}
            {extraRight}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="doc-divider" />

      {/* Client block */}
      {clientName && (
        <div className="doc-client-block">
          <div className="doc-client-label">FACTURÉ À :</div>
          <div className="doc-client-name">{clientName}</div>
          {clientAddress && <div className="doc-client-detail">📍 {clientAddress}</div>}
          {clientPhone  && <div className="doc-client-detail">📞 {clientPhone}</div>}
          {clientEmail  && <div className="doc-client-detail">✉ {clientEmail}</div>}
        </div>
      )}
    </div>
  )
}
