"use client";

import React, { forwardRef } from "react";

type CertificateProps = {
    userName: string;
    skill: string;
    date: string;
};

const Certificate = forwardRef<HTMLDivElement, CertificateProps>(
    ({ userName, skill, date }, ref) => {
        return (
            <div
                ref={ref}
                style={{
                    width: "1200px",
                    height: "850px",
                    backgroundColor: "#FBF6EE",
                    border: "12px solid #11011E",
                    padding: "50px",
                    position: "relative",
                    fontFamily: "Arial, Helvetica, sans-serif",
                    color: "#1F2937",
                    boxSizing: "border-box",
                }}
            >
                {/* INNER BORDER */}
                <div
                    style={{
                        position: "absolute",
                        inset: "16px",
                        border: "3px solid #11011E",
                        pointerEvents: "none",
                    }}
                />

                {/* TOP LOGO */}
                <div style={{ textAlign: "center", marginBottom: 30 }}>
                    <img
                        src="/Logo.png"
                        alt="Logo"
                        style={{
                            height: 74,
                            objectFit: "contain",
                        }}
                    />
                </div>

                {/* TITLE */}
                <div style={{ textAlign: "center" }}>
                    <h1
                        style={{
                            fontSize: 56,
                            letterSpacing: 6,
                            fontWeight: 700,
                            margin: 0,
                            color: "#0FAE96",
                        }}
                    >
                        CERTIFICATE
                    </h1>

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: 20,
                            marginTop: 10,
                        }}
                    >
                        <div style={{ width: 80, height: 2, background: "#C9A24D" }} />
                        <span style={{ letterSpacing: 2 }}>OF COMPLETION</span>
                        <div style={{ width: 80, height: 2, background: "#C9A24D" }} />
                    </div>
                </div>

                {/* BODY */}
                <div
                    style={{
                        textAlign: "center",
                        marginTop: 60,
                        padding: "0 120px",
                    }}
                >
                    <p style={{ fontStyle: "italic", fontSize: 18 }}>
                        This is to certify that
                    </p>

                    <h2
                        style={{
                            fontSize: 38,
                            fontWeight: 700,
                            margin: "20px 0",
                            color: "#0FAE96",
                        }}
                    >
                        {userName}
                    </h2>

                    <div
                        style={{
                            width: 240,
                            height: 2,
                            background: "#C9A24D",
                            margin: "0 auto 20px",
                        }}
                    />

                    <p
                        style={{
                            fontSize: 18,
                            lineHeight: 1.6,
                        }}
                    >
                        has successfully completed the <strong>{skill}</strong>{" "}
                        assessment and demonstrated exceptional skill and dedication
                        in achieving this milestone.
                    </p>
                </div>

                {/* FOOTER */}
                <div
                    style={{
                        position: "absolute",
                        bottom: 70,
                        left: 80,
                        right: 80,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                    }}
                >
                    {/* DATE */}
                    <div>
                        <div
                            style={{
                                width: 160,
                                height: 1,
                                background: "#000",
                                marginBottom: 6,
                            }}
                        />
                        <p style={{ fontWeight: 600 }}>{date}</p>
                        <p style={{ fontSize: 12 }}>DATE</p>
                    </div>

                    {/* ORGANIZATION */}
                    <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: 20, fontWeight: 700, color: "#0FAE96" }}>
                            Jobform Automator
                        </p>
                        <p style={{ fontSize: 12 }}>ISSUING ORGANIZATION</p>
                    </div>

                    {/* SIGNATURE */}
                    <div style={{ textAlign: "right" }}>
                        <img
                            src="/director-sign.png"
                            alt="Director Signature"
                            style={{ height: 50, marginBottom: 6 }}
                        />
                        <div
                            style={{
                                width: 160,
                                height: 1,
                                background: "#000",
                                marginBottom: 6,
                            }}
                        />
                        <p style={{ fontWeight: 600 }}>Saurabh Belote</p>
                        <p style={{ fontSize: 12 }}>Director</p>
                    </div>
                </div>
            </div>
        );
    }
);

Certificate.displayName = "Certificate";
export default Certificate;
