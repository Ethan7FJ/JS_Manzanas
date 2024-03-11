const express = require('express');
const bodyp = require('body-parser');
const mysql = require('mysql2/promise');
const expusu = require('express-session');
const path = require('path');
const app = express();


app.use(bodyp.urlencoded({extended: true}));
app.use(bodyp.json());
app.use(express.static(__dirname));

app.use(expusu({
    secret:'sapo',
    resave: false,
    saveUninitialized:false
})); 
/*  */

app.use(express.static(path.join(__dirname)));

const dab = {
host:'localhost',
user: 'root',
password: '',
database: 'manzanasnj'
};
/* dab.connect((err)=>{
    if(err){
        console.error('Hubo un error al conectarse a la base de datos: ' + err.stack);
        return;
    }
    console.log('Su conexion con la base de datos ha sido exitosa');
}); */

//REGISTRO DE USUARIO
app.post('/registro', async (req,res)=>{
    const {nombre,tipo_documento,documento} = req.body;
        try{
            const unacosn = await mysql.createConnection(dab);
            const indic = await unacosn.execute('SELECT * FROM usuario WHERE tipo_documento = ? AND documento = ?',[tipo_documento,documento]);
            console.log(indic)
            if(indic.length<0){
                res.status(401).send(`
                <script>  
                    window.onload = function(){
                        alert('El usuario ya esta registrado');
                        window.location.href = 'http://127.0.0.1:5500/Vistas/Inicia.html';
                    }
                </script>
                `);
            }
            else{
                await unacosn.execute('INSERT INTO usuario(nombre,tipo_documento,documento) VALUES(?,?,?)',[nombre,tipo_documento,documento]);
                res.status(201).send(`
                <script>
                    window.onload = function(){
                    alert('Su registro fue completado');
                 window.location.href = 'http://127.0.0.1:5500/Vistas/Inicia.html';
                    }
                </script>
                `);
            }
            await unacosn.end();
        }
        catch(error){
            console.error('Hubo un error con el servidor: ',error);
            res.status(500).send(`
            <script>
                window.onload = function(){
                    alert('Sus datos no fueron registrados');
                    window.location.href = 'http://127.0.0.1:5500/Vistas/Index.html';
                }
            </script>
            `);
        }
    });

//Inicio de sesion
app.post('/inicio', async (req,res)=>{
  const {tipo_documento,documento} = req.body;
  try{
    //VERIFICACION DE CREDENCIALES
    const unacosn = await mysql.createConnection(dab);
    const [indic] = await unacosn.execute('SELECT * FROM usuario WHERE tipo_documento = ? AND documento = ?',[tipo_documento,documento]);
    console.log(indic);
    if(indic.length>0){
        req.session.usuario = indic[0].nombre;
        req.session.documento = documento;

        if(indic[0].rol=="admin"){
            const usuario = {nombre: indic[0].nombre};
            console.log(usuario);
            res.locals.usuario = usuario;
            res.sendFile(path.join(__dirname,'../Vistas/Admin.html'));
        }
        else{
            const usuario = {nombre: indic[0].nombre};
            console.log(usuario);
            res.locals.usuario = usuario;
            res.sendFile(path.join(__dirname,'../Vistas/usuario.html'));
        } 
    }
    else{
        res.status(401).send('<script>window.onload = function(){alert("Usuario no encontrado"); window.location.href = "http://127.0.0.1:5500/Vistas/Inicia.html";}</script>') 
    }
    await unacosn.end();
}
  catch(error){
    console.error('Error en el servidor: ', error);
    res.status(500).send(`
    <script>
        window.onload = function(){
            alert('Su registro fue completado');
            window.location.href = 'http://127.0.0.1:5500/Vistas/Index.html';
        }
    </script>
    `)
  }
});

app.post('/imprimir-usuario', (req,res)=>{
    const usuario = req.session.usuario;
    if(usuario){
        res.json({nombre: usuario});
    }
    else{
        res.status(401).send("Usuario no encontrado")
    }
    res.sendFile(__dirname,'../Vistas/usuario.html');
});

app.post('/imprimir-admin',(req,res)=>{
    const usuario = req.session.usuario;
    if(usuario){
        res.json({nombre: usuario});
    }
    else{
        res.status(401).send("Usuario no encontrado")
    }
    res.sendFile(__dirname,'../Vistas/Admin.html');
});


/*-------------------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------------------
|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
                                AQUI COMIENZA LAS FUNCIONES DEL USUARIO
||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
---------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------*/

//MOSTRAR SERVICIOS DISPONIBLES
app.post('/Servicios-usuario',async (req,res)=>{
    const usuario= req.session.usuario;
    const documento = req.session.documento;
    console.log(usuario,documento);
    try{
        const unacosn = await mysql.createConnection(dab);
        const [serviciosData] = await unacosn.execute('SELECT servicios.nombre_s FROM usuario INNER JOIN manzanas on manzanas.codigo_m = usuario.codigo_m INNER JOIN manzanas_servicio on manzanas_servicio.codigo_m = manzanas.codigo_m INNER JOIN servicios on servicios.codigo_s = manzanas_servicio.codigo_s WHERE usuario.documento = ?',[documento]);
        console.log(serviciosData);
        //lO QUE HACE EL MAP ES ENLISTAR LOS DATOS DE ACUERDO AL ORDEN DE LLEGADA
        res.json({servicios: serviciosData.map(row=>row.nombre_s)});
        await unacosn.end();
    }
    catch(error){
        console.error('Error en el servidor',error);
        res.status(500).send('Error en el servidor')
    }});

    //REGISTRAR SOLICITUDES
app.post('/guardad-servicios',async (req,res)=>{

    const usuario = req.session.usuario;
    const documento = req.session.documento;

    console.log(usuario,documento)
    const {servicios, fechaH} = req.body; 

    const unacosn = await mysql.createConnection(dab);
    const [consuID] = await unacosn.query('SELECT usuario.codigo, servicios.codigo_s FROM usuario INNER JOIN servicios WHERE usuario.documento = ? AND servicios.nombre_s = ?',[documento,servicios]);
    console.log(consuID);
    
    try{
        
            await unacosn.execute('INSERT INTO solicitudes(`fecha`,`codigo`,`codigo_s`) values (?,?,?)',[fechaH,consuID[0].codigo,consuID[0].codigo_s]);
        res.status(200);
        await unacosn.end();
    }

    catch(error){
        console.error('Error en el servidor: ',error);
        res.status(500).send('Error en el servidor');
    }
});

//MOSTRAR LAS SOLICITUDES REALIZADAS POR EL USUARIO
app.post('/Solicitudes-usuario', async (req,res)=>{
    const usuario= req.session.usuario;
    const documento = req.session.documento;
    console.log(usuario,documento);
    try{
        const unacosn = await mysql.createConnection(dab);
        const [SolicitudData] = await unacosn.execute('SELECT solicitudes.fecha, servicios.nombre_s FROM solicitudes INNER JOIN usuario ON solicitudes.codigo = usuario.codigo INNER JOIN manzanas ON usuario.codigo_m = manzanas.codigo_m INNER JOIN manzanas_servicio on manzanas.codigo_m = manzanas_servicio.codigo_m INNER JOIN servicios on manzanas_servicio.codigo_s = servicios.codigo_s WHERE usuario.documento = ? AND solicitudes.codigo_s = servicios.codigo_s',[documento]);
        console.log(SolicitudData);
        res.json({solicitud: SolicitudData.map(raw => ([raw.fecha, raw.nombre_s]))});
        await unacosn.end();
    }
    catch(error){
        console.error('Error en el servidor',error);
        res.status(500).send('Error en el servidor');
    }
});

//BORRAR SOLICITUDES
app.post('/eliminar-solicitudes',async (req,res)=>{
    const usuario= req.session.usuario;
    const documento = req.session.documento;
    console.log(usuario,documento);
    const {solicitudes} = req.body;
    console.log(solicitudes);
    const unacosn = await mysql.createConnection(dab);
    const [IDsoli] = await unacosn.execute('SELECT solicitudes.codigo_soli FROM solicitudes INNER JOIN usuario ON usuario.codigo = solicitudes.codigo INNER JOIN manzanas ON manzanas.codigo_m = usuario.codigo_m INNER JOIN manzanas_servicio ON manzanas_servicio.codigo_m = manzanas.codigo_m INNER JOIN servicios ON servicios.codigo_s = manzanas_servicio.codigo_s WHERE usuario.documento = ?',[documento]);
    console.log(IDsoli);

    try{
        
            await unacosn.execute('DELETE FROM solicitudes where solicitudes.codigo_soli = ?',[IDsoli[0].codigo_soli]);
            
    
        await unacosn.end();
    }

    catch(error){
        console.error('Error en el servidor: ',error);
        res.status(500).send('Error en el servidor');
    }
});

/*-------------------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------------------
                                METODOS PARA CERRAR SESION
---------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------*/

//CERRAR SESION
app.post('/Cerrar-cession',(req,res)=>{
    req.session.destroy((err)=>{
        if(err){
            console.error("Hubo un error",err);
            res.status(500).send("Error al cerrar sesion");
        }
        else{
            res.status(200).send("Sesion cerrada exitosamente");
        }
    })
});





/*-------------------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------------------
|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
                                AQUI COMIENZA LAS FUNCIONES DEL ADMIN
||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
---------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------*/


/*-------------------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------------------
                                METODOS DE USUARIOS REGISTRADOS 
---------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------*/
//MOSTRAR LOS USUARIOS REGISTRADOS
app.post('/Registros-usuario',async (req,res)=>{
    try{
        const unacosn = await mysql.createConnection(dab);
        const [UsuariosData] = await unacosn.execute('SELECT * FROM usuario');
        console.log(UsuariosData);
        res.json({registros: UsuariosData.map(rxw => ([rxw.codigo, rxw.nombre, rxw.tipo_documento, rxw.documento, rxw.codigo_m, rxw.rol]))});
        await unacosn.end();
    }
    catch(error){
        console.error('Error en el servidor',error);
        res.status(500).send('Error en el servidor')
    }});

//BORRAR REGISTRO DE USUARIO
    app.post('/eliminar-registro',async (req,res)=>{
        const{eliminar} = req.body;
        console.log('no joddddas',eliminar); 
    
    try{
        const unacosn = await mysql.createConnection(dab);

            await unacosn.query('DELETE FROM solicitudes WHERE solicitudes.codigo = ?',[eliminar]);
            await unacosn.query('DELETE FROM usuario where usuario.codigo = ?',[eliminar]);
    
        await unacosn.end();
    }

    catch(error){
        console.error('Error en el servidor: ',error);
        res.status(500).send('Error en el servidor');
    }
});

    //MOSTRAR USUARIOS DISPONIBLES PARA HACER LA ACTUALIZACION DE REGISTROS
app.post('/Opciones-usuario',async (req,res)=>{
        const{usuario} = req.body;
    console.log('xxxxxxxxx',usuario);
    try{
        const unacosn = await mysql.createConnection(dab);
        const [UsuariosNid] = await unacosn.execute('SELECT usuario.nombre, usuario.tipo_documento, usuario.documento, usuario.codigo_m FROM usuario WHERE usuario.codigo = ?',[usuario[0]]);
        console.log('zzzzzz',UsuariosNid);
        res.json({registros: UsuariosNid.map(rlw => ([rlw.nombre]))}); 
        await unacosn.end();
    }
    catch(error){
        console.error('Error en el servidor',error);
        res.status(500).send('Error en el servidor')
    }});

    //SUBIR LA ACUTALIZACION DE DATOS
    app.post('/Actualizacion-registros', async (req,res)=>{
        const {IDUSU, nombre,tipo_documento, documento, codigo_m, rol} = req.body;
        console.log('Seeaaa',IDUSU, nombre, tipo_documento, documento, codigo_m,rol)
        console.log('no mameees',IDUSU)
            try{
                const unacosn = await mysql.createConnection(dab);
                
                for(const Act of IDUSU){
                    await unacosn.execute('UPDATE usuario SET usuario.nombre = ?, usuario.tipo_documento = ?, usuario.documento = ?, usuario.codigo_m = ?, usuario.rol = ?  WHERE usuario.codigo = ?',[nombre,tipo_documento,documento,codigo_m,rol,Act[0]]);
                }
                await unacosn.end();
            }
            catch(error){
                console.error('Hubo un error con el servidor: ',error);
                res.status(500).send('Erro en el regitro');
            }
        });
    
/*-------------------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------------------
                                METODOS DE GUARGAR MANZANAS 
---------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------*/

//GUARDAR REGISTRO DE MANZANAS
app.post('/registro-manzanas', async (req,res)=>{
    const {nombre_m, direccion_m, municipio_m} = req.body;
        try{
            const unacosn = await mysql.createConnection(dab);
            const indic = await unacosn.execute('SELECT * FROM manzanas WHERE manzanas.nombre_m = ? AND manzanas.direccion_m = ? AND manzanas.municipio_m = ?',[nombre_m,direccion_m,municipio_m]);
            console.log(indic)
            if(indic.length<0){
                res.status(401).send('<script>alert("Manzana ya registrada");  window.location.href</script>');
            }
            else{
                await unacosn.execute('INSERT INTO manzanas(nombre_m,direccion_m,municipio_m) VALUES(?,?,?)',[nombre_m,direccion_m,municipio_m]);
                res.status(201).send('<script>alert("Registro completado");  window.location.href;</script>');
            }
            await unacosn.end();
        }
        catch(error){
            console.error('Hubo un error con el servidor: ',error);
            res.status(500).send('Erro en el regitro');
        }
    });

    //MOSTRAR LAS MANZANAS REGISTRADAS
app.post('/Registros-manzanas',async (req,res)=>{
    try{
        const unacosn = await mysql.createConnection(dab);
        const [ManzanasData] = await unacosn.execute('SELECT * FROM manzanas');
        console.log(ManzanasData);
        res.json({registrosM: ManzanasData.map(rMw => ([rMw.codigo_m, rMw.nombre_m, rMw.direccion_m, rMw.municipio_m]))});
        await unacosn.end();
    }
    catch(error){
        console.error('Error en el servidor',error);
        res.status(500).send('Error en el servidor')
    }});

//MOSTRAR MANZANAS DISPONIBLES PARA HACER LA ACTUALIZACION DE REGISTROS
app.post('/Opciones-manzanas',async (req,res)=>{
    const{manzanas} = req.body;
    console.log('xxxxxxxxx',manzanas);
        try{
            const unacosn = await mysql.createConnection(dab);
            const [ManzanasNid] = await unacosn.execute('SELECT manzanas.nombre_m, manzanas.direccion_m, manzanas.municipio_m FROM manzanas WHERE manzanas.codigo_m = ?',[manzanas[0]]);
            console.log('zzzzzz',ManzanasNid);
            res.json({registrosM: ManzanasNid.map(rlw => ([rlw.nombre]))}); 
            await unacosn.end();
        }
        catch(error){
            console.error('Error en el servidor',error);
            res.status(500).send('Error en el servidor')
        }});

//SUBIR LA ACUTALIZACION DE DATOS
app.post('/Actualizacion-registros-manzanas', async (req,res)=>{
    const {IDMAN, localidad_m,direccion_m, municipio_m} = req.body;
    console.log('Seeaaa',IDMAN, localidad_m, direccion_m, municipio_m);
    console.log('no mameees',IDMAN)
        try{
            const unacosn = await mysql.createConnection(dab);
            
                await unacosn.execute('UPDATE manzanas SET manzanas.nombre_m = ?, manzanas.direccion_m = ?, manzanas.municipio_m = ? WHERE manzanas.codigo_m = ?',[localidad_m,direccion_m,municipio_m,IDMAN[0]]);
            
            await unacosn.end();
        }
        catch(error){
            console.error('Hubo un error con el servidor: ',error);
            res.status(500).send('Erro en el regitro');
        }
    });

/*-------------------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------------------
                                METODOS DE GUARGAR SERVICIOS 
---------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------*/

    //GUARDAR REGISTRO DE SERVICIOS
app.post('/registro-servicios', async (req,res)=>{
    const {nombre_s, tipo_s, descripcion_s} = req.body;
        try{
            const unacosn = await mysql.createConnection(dab);
            const indic = await unacosn.execute('SELECT * FROM servicios WHERE servicios.nombre_s = ? AND servicios.tipo_s = ? ',[nombre_s,tipo_s]);
            console.log(indic)
            if(indic.length<0){
                res.status(401).send('La manzana ya esta registrada');
            }
            else{
                await unacosn.execute('INSERT INTO servicios(nombre_s,tipo_s) VALUES(?,?)',[nombre_s,tipo_s]);
                res.status(201).send('<script>alert("Registro completado")</script>');
            }
            await unacosn.end();
        }
        catch(error){
            console.error('Hubo un error con el servidor: ',error);
            res.status(500).send('Erro en el regitro');
        }
    });

//MOSTRAR LOS SERVICIOS REGISTRADOS
app.post('/Registros-servicios',async (req,res)=>{
    try{
        const unacosn = await mysql.createConnection(dab);
        const [ServiciosData] = await unacosn.execute('SELECT * FROM servicios');
        console.log(ServiciosData);
        res.json({registrosS: ServiciosData.map(rSw => ([rSw.codigo_s, rSw.nombre_s, rSw.tipo_s]))});
        await unacosn.end();
    }
    catch(error){
        console.error('Error en el servidor',error);
        res.status(500).send('Error en el servidor')
    }});

//BORRAR REGISTRO DE SERVICIO
app.post('/eliminar-registro-servicios',async (req,res)=>{
    const{eliminarS} = req.body;
    console.log('no joddddas',eliminarS); 

try{
    const unacosn = await mysql.createConnection(dab);

        await unacosn.query('DELETE FROM manzanas_servicio WHERE manzanas_servicio.codigo_s = ?',[eliminarS]);
        await unacosn.query('DELETE FROM servicios where servicios.codigo_s = ?',[eliminarS]);

    await unacosn.end();
}

catch(error){
    console.error('Error en el servidor: ',error);
    res.status(500).send('Error en el servidor');
}
});

//MOSTRAR SERVICIOS DISPONIBLES PARA HACER LA ACTUALIZACION DE REGISTROS
app.post('/Opciones-servicios',async (req,res)=>{
    const{serviciosxd} = req.body;
    console.log('xxxxxxxxx',serviciosxd);
        try{
            const unacosn = await mysql.createConnection(dab);
            const [ServiciosNid] = await unacosn.execute('SELECT servicios.nombre_s, servicios.tipo_s FROM servicios WHERE servicios.codigo_s = ?',[serviciosxd[0]]);
            console.log('zzzzzz',ServiciosNid);
            res.json({registrosS: ServiciosNid.map(rlw => ([rlw.nombre]))}); 
            await unacosn.end();
        }
        catch(error){
            console.error('Error en el servidor',error);
            res.status(500).send('Error en el servidor')
        }});

//SUBIR LA ACUTALIZACION DE DATOS
app.post('/Actualizacion-registros-servicios', async (req,res)=>{
    const {IDSEV, nombre_s, tipo_s} = req.body;
    console.log('Seeaaa',IDSEV, nombre_s, tipo_s);
    console.log('no mameees',IDSEV)
        try{
            const unacosn = await mysql.createConnection(dab);
            
                await unacosn.execute('UPDATE servicios SET servicios.nombre_s = ?, servicios.tipo_s = ? WHERE servicios.codigo_s = ?',[nombre_s,tipo_s,IDSEV[0]]);
            
            await unacosn.end();
        }
        catch(error){
            console.error('Hubo un error con el servidor: ',error);
            res.status(500).send('Erro en el regitro');
        }
    });

/*-------------------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------------------
                                FUNCION PARA LLAMAR EL SERVIDOR 
---------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------*/

//LLAMANDO DEL SERVIDOR
app.listen(3000, ()=>{
    console.log('Servidor Node.JS ESCUCHANDO');
})
