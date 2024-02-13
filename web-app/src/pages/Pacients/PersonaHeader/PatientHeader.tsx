
const PatientHeader = () => {
    return(
        <div className="bg-white shadow-sm mb-1">
            <div className="container d-flex align-items-center py-3">
                <h6 className="m-0 me-3 d-none d-md-block">Pacientes</h6>
                <input type="search" className="form-control form-control-sm" placeholder="Buscador"></input>
                <div className="flex-fill"></div>
                <div className="btn-group btn-group-sm" style={{paddingTop: '10px'}}>
                    <button className="btn btn-outline-primary ms-3">Nuevo</button>
                </div>
            </div>
        </div>
    )
}

export default PatientHeader;