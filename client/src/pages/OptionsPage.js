import { useRef, useState, useCallback, useEffect, useContext } from 'react'; 

import DatalistInput from 'react-datalist-input'; 
import StudentPairPanel from '../components/StudentPairPanel';

import classes from './OptionsPage.module.css'; 

import PageContext from '../store/PageContext';
import PartitionContext from '../store/PartitionContext';
import LoadingContext from '../store/LoadingContext';

function OptionsPage() 
{ 
  const { setOnOptionsPage } = useContext (PageContext); 
  const { setPartition } = useContext (PartitionContext);  
  const { setIsLoading } = useContext (LoadingContext); 

  // Loading teacher IDs
  const [teacherIdOptions, setTeacherIdOptions] = useState([]); // all teacher IDs (options)
  useEffect (() => 
  {
    const loadTeachers = async() => 
    {
      setIsLoading (true); 

      const response = await fetch ("/api/cims/teacherIDs"); 
      const data = await response.json(); 

      const teacherItems = data.map((teacher) => ({ id: teacher.id, value: teacher.id })); // format into items for dropdown
      setTeacherIdOptions (teacherItems); 

      setIsLoading (false); 
    }

    loadTeachers (); 
  }, []); 

  // Loading classes when teacher ID selected
  const [teacherId, setTeacherId] = useState(null); 
  const [classes, setClasses] = useState([]); // class options for dropdown (all classes taught by teacher with teacherID)

  const teacherSelectHandler = useCallback((id) => 
  {
    setTeacherId(id.value); 
    setSelectedClassId (null); // hide options for pairing students
  }, []); 

  useEffect (() => // called when teacherID selected from dropdown
  {
    if (teacherId === null)
      return; 
      
    const getClasses = async() => 
    {
      setIsLoading(true); 

      const response = await fetch ("/api/cims/classes", // get students for selected teacher's class
      { 
        body: JSON.stringify ({ teacherId }), // send over text representation of json object 
        headers: { "Content-Type": "application/json" }, // let server know to turn plain text back into json object
        method: "POST"
      }); 
      const data = await response.json(); 

      const classItems = data.map ((className) => ({ id: className.classId, value: className.classCode, classId: className.classId })) // value is displayed in dropdown, classId is passed to backend
      setClasses (classItems); 

      setIsLoading(false); 
    }

    getClasses (); 
  }, [teacherId]); 

  const [selectedClassId, setSelectedClassId] = useState (null); // class code
  const [students, setStudents] = useState([]); // array of all students given selected class code

  const selectClassHandler = useCallback((classCode) => 
  {
    setSelectedClassId (classCode.classId); 
  }, []); 

  useEffect (() => 
  {
    if (selectedClassId === null)
      return; 

    const getStudents = async() => 
    {
      setIsLoading(true); 

      const response = await fetch ("/api/cims/students", // get students for selected class
      { 
        body: JSON.stringify ({ classId: selectedClassId }), // send over text representation of json object 
        headers: { "Content-Type": "application/json" }, // let server know to turn plain text back into json object
        method: "POST"
      }); 
      const data = await response.json(); 

      const studentItems = data.map ((student) => ({ id: student.username, value: (!('givenName' in student) || student.givenName === '') ? student.forename : student.givenName, student })) // some student objects don't have property givenName
      setStudents (studentItems); // student items for dropdown
      
      setIsLoading(false); 
    }

    getStudents(); 
  }, [selectedClassId]); 

  // Running algorithm  
  const groupSizeInputRef = useRef (); 
  const runAlgorithmHandler = async() => 
  {
    setIsLoading (true); 

    const groupSize = groupSizeInputRef.current.value; 

    console.log ("Running algorithm on class " + teacherId + " with group size " + groupSize); 

    const algorithmData = 
    {
      classId: selectedClassId, 
      groupSize, 
      pairedStudents, 
      separatedStudents
    }

    // console.log (algorithmData); 

    const response = await fetch ("/api/personalityData", 
    { 
      body: JSON.stringify (algorithmData), // send over text representation of json object 
      headers: { "Content-Type": "application/json" }, // let server know to turn plain text back into json object
      method: "POST"
    }); 
    const data = await response.json(); 

    setPartition (data); // update partition context
    setOnOptionsPage (false); // go to groups page
    
    setIsLoading (false); 
  }

  const [affiliationPanelActive, setAfflilationPanelActive] = useState (false); 
  const [pairedStudents, setPairedStudents] = useState([]); 
  const [separatedStudents, setSeparatedStudents] = useState([]); 

  const toggleAffiliationPanel = () => 
  {
    setAfflilationPanelActive (!affiliationPanelActive); 
  }

  const updateAffiliations = (newPairedStudents, newSeparatedStudents) => 
  {
    setPairedStudents (newPairedStudents); 
    setSeparatedStudents (newSeparatedStudents)
  }

  return (
    <div>
      <DatalistInput 
        placeholder="Teacher ID (e.g. kem)"
        onSelect={(id) => teacherSelectHandler(id)}
        items={teacherIdOptions}
      />

      {teacherId && <DatalistInput // TODO: automatically select current class being taught (from CIMS); add (current) to name in dropdown list
        placeholder="Class"
        onSelect={(classItem) => selectClassHandler (classItem)}
        items={classes}
        value=""
      />}
  
      {selectedClassId && <div>
        <h2>Group Size</h2>
        <div>
          <input type="number" id="groupSize" name="groupSize" min="2" max="6" defaultValue={5} ref={groupSizeInputRef} />
          <button onClick={runAlgorithmHandler}>Generate</button>
        </div>

        <button onClick={toggleAffiliationPanel}>SETTINGS</button>
      </div>}
      { affiliationPanelActive && <StudentPairPanel 
      // { true && <StudentPairPanel 
        students={students} 
        pairedStudents={pairedStudents}
        separatedStudents={separatedStudents}
        closeAffiliationPanel={toggleAffiliationPanel}
        updateAffiliations={updateAffiliations} /> }
    </div>
  );
}

export default OptionsPage;
