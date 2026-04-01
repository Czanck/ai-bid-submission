interface EnvelopeSvgProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Open envelope — full SVG combining back + front.
 * Renders at natural 250x250 proportions.
 */
export function OpenEnvelope({ width = 250, height = 250, className, style }: EnvelopeSvgProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 250 250"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Back body outline */}
      <path
        d="M125 8.00977C119.94 8.00977 116.1 9.92977 112.73 12.8898L16.53 94.6498C13.52 97.5098 12.48 101.33 12.48 105.84V228.64C12.48 236.05 17.26 241.03 23.66 241.03H226.06C232.81 241.03 237.56 235.26 237.56 228.36V105.16C237.56 100.36 236.39 97.1098 233.91 94.7098L136.91 12.7898C133.48 9.82977 129.91 8.07977 124.96 8.07977L125 8.00977Z"
        fill="white"
        stroke="#324055"
        strokeMiterlimit="10"
      />
      {/* Right inner side */}
      <path
        d="M144 166L236 98.5C237.16 99.79 237.54 102.51 237.54 106.47V228.37C237.54 233.83 234.84 238.2 231.77 238.81L144 166Z"
        fill="white"
        stroke="#324055"
        strokeMiterlimit="10"
      />
      {/* Left inner side */}
      <path
        d="M106 165.5L14.05 98.1299C13.03 99.7299 12.48 102.33 12.48 105.68V228.18C12.48 233.11 14.36 236.72 16.75 238.15L106 165.5Z"
        fill="white"
        stroke="#324055"
        strokeMiterlimit="10"
      />
      {/* Bottom V flap */}
      <path
        d="M231.8 238.6C229.81 240.17 227.67 240.98 224.76 240.98H23.6601C20.1401 240.98 17.9101 239.75 16.3501 237.96L114.11 159.09C120.81 153.4 129.43 153.72 135.88 159.09L231.78 238.6H231.8Z"
        fill="white"
        stroke="#324055"
        strokeMiterlimit="10"
      />
    </svg>
  );
}

/**
 * The open envelope's top flap — the triangular part that folds down.
 * Extracted from the back SVG. This is the part above the body (y < ~95).
 * viewBox is just the flap portion.
 */
export function EnvelopeFlap({ width = 250, height = 100, className, style }: EnvelopeSvgProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 250 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Open flap triangle — peak at top center, base at bottom */}
      <path
        d="M125 2C119.94 2 116.1 3.92 112.73 6.88L16.53 88.65C14.5 90.5 13.2 93 12.48 95.5H237.56C236.8 93 235.5 90.5 233.91 88.71L136.91 6.79C133.48 3.83 129.91 2.08 124.96 2.08L125 2Z"
        fill="white"
        stroke="#324055"
        strokeMiterlimit="10"
      />
    </svg>
  );
}

/** Complete sealed envelope for the fly-away phase */
export function SealedEnvelope({ width = 235, height = 250, className, style }: EnvelopeSvgProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 235 250"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M220.552 71.8602L135.341 137.9L125.838 130.05C119.793 124.95 111.427 125.86 106.417 130.74L97.976 138.23L12.9624 71.1602C11.8532 73.4202 11.2798 76.1702 11.2798 79.2002V201.4C11.2798 208.67 15.7448 213.98 21.7608 213.98H212.111C218.456 213.98 222.921 207.96 222.921 201.31V78.3102C222.921 75.6102 222.15 73.5302 220.58 71.8702L220.552 71.8602Z"
        fill="white"
      />
      <path
        d="M134.918 138.99L221.398 71.4902C222.488 72.7802 222.845 75.4998 222.845 79.4598V201.36C222.845 206.82 220.307 211.19 217.422 211.8L134.918 138.99Z"
        fill="white"
        stroke="#324055"
        strokeMiterlimit="10"
      />
      <path
        d="M99.1979 138.49L12.7649 71.1201C11.8061 72.7201 11.2891 75.3201 11.2891 78.6701V201.17C11.2891 206.1 13.0563 209.71 15.3029 211.14L99.1979 138.49Z"
        fill="white"
        stroke="#324055"
        strokeMiterlimit="10"
      />
      <path
        d="M217.45 211.59C215.58 213.16 213.568 213.97 210.833 213.97H21.7986C18.4898 213.97 16.3936 212.74 14.9272 210.95L106.822 132.08C113.12 126.39 121.222 126.71 127.285 132.08L217.431 211.59H217.45Z"
        fill="white"
        stroke="#324055"
        strokeMiterlimit="10"
      />
      <path
        d="M218 67.5C216.437 66.1203 213.681 64.9997 210.946 64.9997H21.9116C18.6028 64.9997 13 69 13 71L106.935 146.89C113.233 152.58 121.335 152.26 127.398 146.89L221.5 71.5L220 69.5L218 67.5Z"
        fill="white"
        stroke="#324055"
        strokeMiterlimit="10"
      />
    </svg>
  );
}
