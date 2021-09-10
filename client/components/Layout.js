import Head from 'next/head'

// import 'bootstrap/dist/css/bootstrap.min.css';


export const Flow = ({ children, style, maxWidth }) => (
  <div style={style}>
    {children}
    <style jsx>{`
      div {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        margin: 0 auto;
        padding: 0px;
      }
    `}</style>
  </div>
)

export const Wrapped = ({ children, style, maxWidth }) => (
    <div style={style}>
      {children}
      <style jsx>{`
        div {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          justify-content: center;
          text-align: center;
          max-width: ${maxWidth?maxWidth:1000}px;
          margin: 0 auto;
          padding: 0px;
        }
      `}</style>
    </div>
  )

export const Center = ({ children, style, maxWidth }) => (
    <div style={style}>
      {children}
      <style jsx>{`
        div {
          max-width: ${maxWidth?maxWidth:1000}px;
          margin: 0 auto;
          padding: 0px;
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
          padding-left: 0px;
          padding-right: 0px;
        }
      `}</style>
    </div>
  )
  