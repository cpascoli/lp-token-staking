import Head from 'next/head'

import 'bootstrap/dist/css/bootstrap.min.css';

export const Center = ({ children, style, maxWidth }) => (
    <div style={style}>
      {children}
      <style jsx>{`
        div {
          max-width: ${maxWidth?maxWidth:1000}px;
          margin: 0 auto;
          padding: 20px;
        }
      `}</style>
    </div>
  )

  export const Page = ({ children }) => (
    <div>
      <Head>
        <link href="https://fonts.googleapis.com/css?family=Lato:400,700" rel="stylesheet" />
      </Head>

      <main>
        {children}
      </main>
  
      <style global jsx>{`
        * {
          margin: 0;
          padding: 0;
        }
        body {
          background-color: #FAFAFF;
          font-family: 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #222222;
        }
        main {
          padding-top: 20px;
          padding-left: 20px;
          padding-right: 20px;
        }
      `}</style>
    </div>
  )
  