import React from "react"
import {
  GPT,
  Notion,
  Slack,
  Zoom,
  OnlyOffice,
  Calendar
} from "./logo"
import { Button } from "./ui/button"

export default function IntegrationsSection() {
  return (
    <section>
      <div className=" py-10 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid items-center sm:grid-cols-2">
            {/* Section des logos */}
            <div className="relative mx-auto w-fit">
              {/* Fond radial */}
              <div className="absolute inset-0 z-10 bg-gradient-to-b sm:bg-gradient-to-r from-transparent to-white rounded-xl"></div>

              {/* Première ligne de logos */}
              <div className="mx-auto mb-2 flex w-fit justify-center gap-2">
                <IntegrationCard>
                  <GPT />
                </IntegrationCard>
                <IntegrationCard>
                  <Notion />
                </IntegrationCard>
              </div>

              {/* Deuxième ligne de logos */}
              <div className="mx-auto my-2 flex w-fit justify-center gap-2">
                <IntegrationCard>
                  <Slack/>
                </IntegrationCard>
                <IntegrationCard className="border shadow-2xl border-gray-300 z-50">
                  <img src="./logo.svg" className='w-10 h-10'/>
                </IntegrationCard>
                <IntegrationCard>
                  <Zoom />
                </IntegrationCard>
              </div>

              {/* Troisième ligne de logos */}
              <div className="mx-auto flex w-fit justify-center gap-2">
                <IntegrationCard>
                  <OnlyOffice />
                </IntegrationCard>
                <IntegrationCard>
                  <Calendar />
                </IntegrationCard>
              </div>
            </div>

            {/* Texte */}
            <div className="mx-auto mt-6 max-w-lg space-y-6 text-center sm:mt-0 sm:text-left">
              <h2 className="text-emerald-600 text-3xl font-semibold md:text-4xl">
                Integrate with your favorite tools
              </h2>
              <p className="text-black/50 font-medium text-[16px]">
                Connect seamlessly with popular platforms and services to
                enhance your workflow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const IntegrationCard = ({ children, className }) => {
  return (
    <div
      className={`relative flex w-20 h-20 bg-white rounded-xl ${className ? className : ""}`}
    >
      {/* Bordure */}
      <div className="absolute inset-0 rounded-xl border border-gray-300"></div>

      {/* Contenu */}
      <div className="relative z-20 m-auto w-12 h-12 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
