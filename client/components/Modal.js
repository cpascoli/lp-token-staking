export default ({ onClose, children }) => (
    <div>

      <div 
        className="overlay" 
        onClick={onClose} 
      />
      <div className="form-modal">
        {children}
      </div>
  
      <style jsx>{`
        .overlay {
          background-color: rgba(65,65,85,0.58);
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 110;
        }
        .form-modal {
          position: fixed;
          left: 50%;
          top: 50%;
          transform: translateX(-50%) translateY(-50%);
          width: 538px;
          background-color: white;
          box-shadow: 0 1px 27px 0 rgba(0,0,0,0.19);
          border-radius: 3px;
          padding: 14px;
          z-index: 120;
        }
        .modal :global(h3) {
          text-align: center;
          margin: 10px 0;
        }
      `}</style>
    </div>
  )